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
public class MessagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public MessagesController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager
    )
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var messages = await _context
            .Messages.Where(m => m.SenderUserId == userId || m.ReceiverUserId == userId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        return Ok(messages);
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var allMessages = await _context
            .Messages.Where(m => m.SenderUserId == userId || m.ReceiverUserId == userId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        var blockedByMe = await _context.BlockedUsers.Where(b => b.BlockerId == userId).Select(b => b.BlockedId).ToListAsync();
        var blockedMe = await _context.BlockedUsers.Where(b => b.BlockedId == userId).Select(b => b.BlockerId).ToListAsync();

        var grouped = allMessages
            .GroupBy(m => m.SenderUserId == userId ? m.ReceiverUserId : m.SenderUserId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(x => x.SentAt).First();
                var otherUserId =
                    latest.SenderUserId == userId ? latest.ReceiverUserId : latest.SenderUserId;
                var unreadCount = g.Count(x => x.ReceiverUserId == userId && !x.IsRead);

                return new
                {
                    OtherUserId = otherUserId,
                    Latest = latest,
                    UnreadCount = unreadCount,
                    IBlockedThem = blockedByMe.Contains(otherUserId),
                    TheyBlockedMe = blockedMe.Contains(otherUserId)
                };
            })
            .OrderByDescending(x => x.Latest.SentAt)
            .ToList();

        var otherUserIds = grouped.Select(x => x.OtherUserId).Distinct().ToList();

        var users = await _userManager
            .Users.Where(u => otherUserIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.CompanyName,
                u.ProfessionalTitle,
            })
            .ToListAsync();

        var result = grouped.Select(x =>
        {
            var u = users.FirstOrDefault(a => a.Id == x.OtherUserId);

            var displayName =
                u == null ? "Unknown user"
                : !string.IsNullOrWhiteSpace($"{u.FirstName} {u.LastName}".Trim())
                    ? $"{u.FirstName} {u.LastName}".Trim()
                : !string.IsNullOrWhiteSpace(u.CompanyName) ? u.CompanyName
                : u.Email ?? "Unknown user";

            return new
            {
                otherUserId = x.OtherUserId,
                otherUserName = displayName,
                otherUserEmail = u?.Email,
                otherUserCompany = u?.CompanyName,
                otherUserTitle = u?.ProfessionalTitle,
                lastMessageId = x.Latest.Id,
                lastMessageSubject = x.Latest.Subject,
                lastMessageContent = x.Latest.Content,
                lastMessageSentAt = x.Latest.SentAt,
                unreadCount = x.UnreadCount,
                iBlockedThem = x.IBlockedThem,
                theyBlockedMe = x.TheyBlockedMe
            };
        });

        return Ok(result);
    }

    [HttpGet("thread/{otherUserId}")]
    public async Task<IActionResult> GetThread(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var messages = await _context
            .Messages.Where(m =>
                (m.SenderUserId == userId && m.ReceiverUserId == otherUserId)
                || (m.SenderUserId == otherUserId && m.ReceiverUserId == userId)
            )
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        var unreadMessages = messages.Where(m => m.ReceiverUserId == userId && !m.IsRead).ToList();

        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
        }

        if (unreadMessages.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        var iBlockedThem = await _context.BlockedUsers.AnyAsync(b => b.BlockerId == userId && b.BlockedId == otherUserId);
        var theyBlockedMe = await _context.BlockedUsers.AnyAsync(b => b.BlockerId == otherUserId && b.BlockedId == userId);

        return Ok(new
        {
            messages,
            iBlockedThem,
            theyBlockedMe
        });
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageRequest request)
    {
        var senderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderUserId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.ReceiverUserId))
            return BadRequest(new { message = "Receiver is required." });

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "Message content is required." });

        // Check if blocked
        var isBlocked = await _context.BlockedUsers.AnyAsync(b =>
            (b.BlockerId == request.ReceiverUserId && b.BlockedId == senderUserId)
            || (b.BlockerId == senderUserId && b.BlockedId == request.ReceiverUserId)
        );

        if (isBlocked)
            return BadRequest(new { message = "Messaging is blocked between you and this user." });

        var receiver = await _userManager.FindByIdAsync(request.ReceiverUserId);
        if (receiver == null)
            return NotFound(new { message = "Receiver not found." });

        var message = new Message
        {
            SenderUserId = senderUserId,
            ReceiverUserId = request.ReceiverUserId,
            JobApplicationId = request.JobApplicationId,
            Subject = request.Subject?.Trim() ?? "",
            Content = request.Content.Trim(),
            IsRead = false,
            SentAt = DateTime.UtcNow,
        };

        _context.Messages.Add(message);

        _context.Notifications.Add(
            new Notification
            {
                UserId = request.ReceiverUserId,
                Title = "New message",
                Message = string.IsNullOrWhiteSpace(request.Subject)
                    ? "You received a new message."
                    : $"You received a new message: {request.Subject}",
                Type = "Message",
                IsRead = false,
                LinkUrl = "/messages",
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();

        return Ok(new { message = "Message sent successfully." });
    }

    [HttpDelete("conversation/{otherUserId}")]
    public async Task<IActionResult> DeleteConversation(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var messages = await _context.Messages
            .Where(m => (m.SenderUserId == userId && m.ReceiverUserId == otherUserId)
                     || (m.SenderUserId == otherUserId && m.ReceiverUserId == userId))
            .ToListAsync();

        _context.Messages.RemoveRange(messages);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Conversation deleted." });
    }

    [HttpPost("block/{otherUserId}")]
    public async Task<IActionResult> BlockUser(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var existing = await _context.BlockedUsers.FirstOrDefaultAsync(b => b.BlockerId == userId && b.BlockedId == otherUserId);
        if (existing != null) return Ok(new { message = "User already blocked." });

        _context.BlockedUsers.Add(new BlockedUser { BlockerId = userId, BlockedId = otherUserId });
        await _context.SaveChangesAsync();
        return Ok(new { message = "User blocked." });
    }

    [HttpDelete("block/{otherUserId}")]
    public async Task<IActionResult> UnblockUser(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var existing = await _context.BlockedUsers.FirstOrDefaultAsync(b => b.BlockerId == userId && b.BlockedId == otherUserId);
        if (existing == null) return Ok(new { message = "User not blocked." });

        _context.BlockedUsers.Remove(existing);
        await _context.SaveChangesAsync();
        return Ok(new { message = "User unblocked." });
    }

    [HttpGet("blocked-ids")]
    public async Task<IActionResult> GetBlockedIds()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var ids = await _context.BlockedUsers
            .Where(b => b.BlockerId == userId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        return Ok(ids);
    }

    public class SendMessageRequest
    {
        public string ReceiverUserId { get; set; } = "";
        public int? JobApplicationId { get; set; }
        public string Subject { get; set; } = "";
        public string Content { get; set; } = "";
    }
}
