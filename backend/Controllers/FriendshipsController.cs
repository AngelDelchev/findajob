using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendshipsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public FriendshipsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var friendIds = await _context.Friendships
            .Where(f => f.UserId == userId)
            .Select(f => f.FriendId)
            .ToListAsync();

        var blockedByMe = await _context.BlockedUsers
            .Where(b => b.BlockerId == userId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        var users = await _userManager.Users
            .Where(u => friendIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.CompanyName,
                u.ProfessionalTitle,
                IsBlocked = blockedByMe.Contains(u.Id)
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var requests = await _context.FriendRequests
            .Where(r => (r.ReceiverId == userId || r.SenderId == userId) && r.Status == "Pending")
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var otherUserIds = requests.Select(r => r.SenderId == userId ? r.ReceiverId : r.SenderId).Distinct().ToList();
        var others = await _userManager.Users
            .Where(u => otherUserIds.Contains(u.Id))
            .ToListAsync();

        var result = requests.Select(r =>
        {
            var isOutgoing = r.SenderId == userId;
            var otherId = isOutgoing ? r.ReceiverId : r.SenderId;
            var s = others.FirstOrDefault(u => u.Id == otherId);
            return new
            {
                r.Id,
                r.SenderId,
                r.ReceiverId,
                r.CreatedAt,
                IsOutgoing = isOutgoing,
                OtherName = s != null ? $"{s.FirstName} {s.LastName}".Trim() : "Unknown",
                OtherTitle = s?.ProfessionalTitle ?? s?.CompanyName
            };
        });

        return Ok(result);
    }

    [HttpPost("request/{receiverId}")]
    public async Task<IActionResult> SendRequest(string receiverId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (userId == receiverId) return BadRequest(new { message = "You cannot add yourself as a friend." });

        var alreadyFriends = await _context.Friendships.AnyAsync(f => f.UserId == userId && f.FriendId == receiverId);
        if (alreadyFriends) return BadRequest(new { message = "You are already friends." });

        var existing = await _context.FriendRequests.FirstOrDefaultAsync(r =>
            r.SenderId == userId && r.ReceiverId == receiverId && r.Status == "Pending");

        if (existing != null) return Ok(new { message = "Request already sent." });

        var request = new FriendRequest { SenderId = userId, ReceiverId = receiverId };
        _context.FriendRequests.Add(request);

        _context.Notifications.Add(new Notification
        {
            UserId = receiverId,
            Title = "New friend request",
            Message = "Someone wants to connect with you.",
            Type = "FriendRequest",
            LinkUrl = "/employee", // Or employer
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Friend request sent." });
    }

    [HttpPost("requests/{id:int}/accept")]
    public async Task<IActionResult> AcceptRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var request = await _context.FriendRequests.FindAsync(id);

        if (request == null || request.ReceiverId != userId) return NotFound();
        if (request.SenderId == userId) return BadRequest(new { message = "You cannot add yourself as a friend." });

        var alreadyFriends = await _context.Friendships.AnyAsync(f => f.UserId == userId && f.FriendId == request.SenderId);
        if (alreadyFriends)
        {
            request.Status = "Accepted";
            await _context.SaveChangesAsync();
            return Ok(new { message = "You are already friends." });
        }

        request.Status = "Accepted";

        // Create bidirectional friendship
        _context.Friendships.Add(new Friendship { UserId = userId, FriendId = request.SenderId });
        _context.Friendships.Add(new Friendship { UserId = request.SenderId, FriendId = userId });

        _context.Notifications.Add(new Notification
        {
            UserId = request.SenderId,
            Title = "Friend request accepted",
            Message = "You have a new connection!",
            Type = "FriendRequest",
            LinkUrl = "/employee",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Friend request accepted." });
    }

    [HttpPost("requests/{id:int}/reject")]
    public async Task<IActionResult> RejectRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var request = await _context.FriendRequests.FindAsync(id);

        if (request == null || request.ReceiverId != userId) return NotFound();

        request.Status = "Rejected";
        await _context.SaveChangesAsync();
        return Ok(new { message = "Friend request rejected." });
    }

    [HttpDelete("requests/{id:int}")]
    public async Task<IActionResult> CancelRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var request = await _context.FriendRequests.FindAsync(id);

        if (request == null || (request.SenderId != userId && request.ReceiverId != userId))
            return NotFound();

        _context.FriendRequests.Remove(request);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Request removed." });
    }

    [HttpDelete("friends/{friendId}")]
    public async Task<IActionResult> RemoveFriend(string friendId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var fs1 = await _context.Friendships.FirstOrDefaultAsync(f => f.UserId == userId && f.FriendId == friendId);
        var fs2 = await _context.Friendships.FirstOrDefaultAsync(f => f.UserId == friendId && f.FriendId == userId);

        if (fs1 != null) _context.Friendships.Remove(fs1);
        if (fs2 != null) _context.Friendships.Remove(fs2);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Friend removed." });
    }

    [HttpGet("status/{otherUserId}")]
    public async Task<IActionResult> GetFriendshipStatus(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var isFriend = await _context.Friendships.AnyAsync(f => f.UserId == userId && f.FriendId == otherUserId);
        var requestSent = await _context.FriendRequests.AnyAsync(r => r.SenderId == userId && r.ReceiverId == otherUserId && r.Status == "Pending");
        var requestReceived = await _context.FriendRequests.AnyAsync(r => r.SenderId == otherUserId && r.ReceiverId == userId && r.Status == "Pending");

        return Ok(new { isFriend, requestSent, requestReceived });
    }
}
