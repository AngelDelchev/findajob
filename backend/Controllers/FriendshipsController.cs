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
    private const string StatusPending = "Pending";
    private const string StatusAccepted = "Accepted";
    private const string StatusRejected = "Rejected";

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public FriendshipsController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager
    )
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var friendIds = await _context
            .Friendships.Where(f => f.UserId == userId)
            .Select(f => f.FriendId)
            .ToListAsync();

        var blockedByMe = await _context
            .BlockedUsers.Where(b => b.BlockerId == userId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        var friends = await _userManager
            .Users.AsNoTracking()
            .Where(u => friendIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.CompanyName,
                u.ProfessionalTitle,
            })
            .ToListAsync();

        return Ok(
            friends.Select(f => new
            {
                f.Id,
                f.FirstName,
                f.LastName,
                f.CompanyName,
                f.ProfessionalTitle,
                IsBlocked = blockedByMe.Contains(f.Id),
            })
        );
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var requests = await _context
            .FriendRequests.AsNoTracking()
            .Where(r => (r.ReceiverId == userId || r.SenderId == userId) && r.Status == StatusPending)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var otherIds = requests
            .Select(r => r.SenderId == userId ? r.ReceiverId : r.SenderId)
            .Distinct()
            .ToList();

        var others = await _userManager
            .Users.AsNoTracking()
            .Where(u => otherIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.CompanyName,
                u.ProfessionalTitle,
            })
            .ToListAsync();

        var result = requests.Select(request =>
        {
            var isOutgoing = request.SenderId == userId;
            var otherId = isOutgoing ? request.ReceiverId : request.SenderId;
            var other = others.FirstOrDefault(u => u.Id == otherId);

            return new
            {
                request.Id,
                request.SenderId,
                request.ReceiverId,
                request.CreatedAt,
                IsOutgoing = isOutgoing,
                OtherUserId = otherId,
                OtherName = other is null
                    ? "Unknown user"
                    : $"{other.FirstName} {other.LastName}".Trim(),
                OtherTitle = other?.ProfessionalTitle ?? other?.CompanyName ?? "",
            };
        });

        return Ok(result);
    }

    [HttpPost("request/{receiverId}")]
    public async Task<IActionResult> SendRequest(string receiverId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (userId == receiverId)
        {
            return BadRequest(new { message = "You cannot add yourself as a friend." });
        }

        // The recipient's existence was never checked, so a request could be created
        // against any id at all.
        if (await _userManager.FindByIdAsync(receiverId) is null)
        {
            return NotFound(new { message = "User not found." });
        }

        var isBlocked = await _context.BlockedUsers.AnyAsync(b =>
            (b.BlockerId == receiverId && b.BlockedId == userId)
            || (b.BlockerId == userId && b.BlockedId == receiverId)
        );

        if (isBlocked)
        {
            return BadRequest(new { message = "You cannot send a request to this user." });
        }

        if (await _context.Friendships.AnyAsync(f => f.UserId == userId && f.FriendId == receiverId))
        {
            return BadRequest(new { message = "You are already friends." });
        }

        // Checking only the outgoing direction meant A and B could each hold a pending
        // request against the other, leaving two rows for one relationship.
        var existing = await _context.FriendRequests.FirstOrDefaultAsync(r =>
            r.Status == StatusPending
            && (
                (r.SenderId == userId && r.ReceiverId == receiverId)
                || (r.SenderId == receiverId && r.ReceiverId == userId)
            )
        );

        if (existing is not null)
        {
            return Ok(new
            {
                message = existing.SenderId == userId
                    ? "Request already sent."
                    : "This user has already sent you a request.",
            });
        }

        _context.FriendRequests.Add(
            new FriendRequest { SenderId = userId, ReceiverId = receiverId }
        );

        var sender = await _userManager.FindByIdAsync(userId);

        _context.Notifications.Add(
            new Notification
            {
                UserId = receiverId,
                Title = "New connection request",
                Message = $"{DisplayName(sender)} would like to connect with you.",
                Type = NotificationTypes.FriendRequest,
                LinkUrl = await ConnectionsLinkForAsync(receiverId),
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();

        return Ok(new { message = "Friend request sent." });
    }

    [HttpPost("requests/{id:int}/accept")]
    public async Task<IActionResult> AcceptRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var request = await _context.FriendRequests.FindAsync(id);
        if (request is null || request.ReceiverId != userId || request.Status != StatusPending)
        {
            return NotFound();
        }

        request.Status = StatusAccepted;

        var alreadyFriends = await _context.Friendships.AnyAsync(f =>
            f.UserId == userId && f.FriendId == request.SenderId
        );

        if (!alreadyFriends)
        {
            _context.Friendships.Add(new Friendship { UserId = userId, FriendId = request.SenderId });
            _context.Friendships.Add(new Friendship { UserId = request.SenderId, FriendId = userId });
        }

        var accepter = await _userManager.FindByIdAsync(userId);

        _context.Notifications.Add(
            new Notification
            {
                UserId = request.SenderId,
                Title = "Connection accepted",
                Message = $"{DisplayName(accepter)} accepted your connection request.",
                Type = NotificationTypes.FriendRequest,
                LinkUrl = await ConnectionsLinkForAsync(request.SenderId),
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();

        return Ok(new { message = "Friend request accepted." });
    }

    [HttpPost("requests/{id:int}/reject")]
    public async Task<IActionResult> RejectRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var request = await _context.FriendRequests.FindAsync(id);

        if (request is null || request.ReceiverId != userId)
        {
            return NotFound();
        }

        request.Status = StatusRejected;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Friend request rejected." });
    }

    [HttpDelete("requests/{id:int}")]
    public async Task<IActionResult> CancelRequest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var request = await _context.FriendRequests.FindAsync(id);

        if (request is null || (request.SenderId != userId && request.ReceiverId != userId))
        {
            return NotFound();
        }

        _context.FriendRequests.Remove(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Request removed." });
    }

    [HttpDelete("friends/{friendId}")]
    public async Task<IActionResult> RemoveFriend(string friendId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var links = await _context
            .Friendships.Where(f =>
                (f.UserId == userId && f.FriendId == friendId)
                || (f.UserId == friendId && f.FriendId == userId)
            )
            .ToListAsync();

        _context.Friendships.RemoveRange(links);

        // Clearing the settled request lets either side connect again later.
        var requests = await _context
            .FriendRequests.Where(r =>
                (r.SenderId == userId && r.ReceiverId == friendId)
                || (r.SenderId == friendId && r.ReceiverId == userId)
            )
            .ToListAsync();

        _context.FriendRequests.RemoveRange(requests);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Friend removed." });
    }

    [HttpGet("status/{otherUserId}")]
    public async Task<IActionResult> GetFriendshipStatus(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var incoming = await _context.FriendRequests.FirstOrDefaultAsync(r =>
            r.SenderId == otherUserId && r.ReceiverId == userId && r.Status == StatusPending
        );

        return Ok(new
        {
            isFriend = await _context.Friendships.AnyAsync(f =>
                f.UserId == userId && f.FriendId == otherUserId
            ),
            requestSent = await _context.FriendRequests.AnyAsync(r =>
                r.SenderId == userId && r.ReceiverId == otherUserId && r.Status == StatusPending
            ),
            requestReceived = incoming is not null,
            // Returned so the UI can accept directly instead of re-fetching the whole list.
            incomingRequestId = incoming?.Id,
        });
    }

    /// <summary>
    /// Connection notifications used to link to <c>/employee</c> for everyone, which
    /// sent employers to a dashboard they have no access to.
    /// </summary>
    private async Task<string> ConnectionsLinkForAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return "/";
        }

        var roles = await _userManager.GetRolesAsync(user);

        if (roles.Contains(Roles.Employer))
        {
            return "/employer";
        }

        return roles.Contains(Roles.Admin) ? "/admin" : "/employee";
    }

    private static string DisplayName(ApplicationUser? user)
    {
        if (user is null)
        {
            return "Someone";
        }

        var name = $"{user.FirstName} {user.LastName}".Trim();
        if (!string.IsNullOrWhiteSpace(name))
        {
            return name;
        }

        return string.IsNullOrWhiteSpace(user.CompanyName) ? "Someone" : user.CompanyName;
    }
}
