using System.ComponentModel.DataAnnotations;
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

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var messages = await VisibleMessages(userId).AsNoTracking().ToListAsync();

        var blockedByMe = await _context
            .BlockedUsers.Where(b => b.BlockerId == userId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        var blockedMe = await _context
            .BlockedUsers.Where(b => b.BlockedId == userId)
            .Select(b => b.BlockerId)
            .ToListAsync();

        var conversations = messages
            .GroupBy(m => m.SenderUserId == userId ? m.ReceiverUserId : m.SenderUserId)
            .Select(group => new
            {
                OtherUserId = group.Key,
                Latest = group.MaxBy(m => m.SentAt)!,
                UnreadCount = group.Count(m => m.ReceiverUserId == userId && !m.IsRead),
            })
            .OrderByDescending(c => c.Latest.SentAt)
            .ToList();

        var otherIds = conversations.Select(c => c.OtherUserId).ToList();
        var users = await _userManager
            .Users.AsNoTracking()
            .Where(u => otherIds.Contains(u.Id))
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

        var result = conversations.Select(conversation =>
        {
            var other = users.FirstOrDefault(u => u.Id == conversation.OtherUserId);

            return new
            {
                otherUserId = conversation.OtherUserId,
                otherUserName = DisplayName(
                    other?.FirstName,
                    other?.LastName,
                    other?.CompanyName,
                    other?.Email
                ),
                otherUserCompany = other?.CompanyName,
                otherUserTitle = other?.ProfessionalTitle,
                lastMessageId = conversation.Latest.Id,
                lastMessageSubject = conversation.Latest.Subject,
                lastMessageContent = conversation.Latest.Content,
                lastMessageSentAt = conversation.Latest.SentAt,
                unreadCount = conversation.UnreadCount,
                iBlockedThem = blockedByMe.Contains(conversation.OtherUserId),
                theyBlockedMe = blockedMe.Contains(conversation.OtherUserId),
            };
        });

        return Ok(result);
    }

    [HttpGet("thread/{otherUserId}")]
    public async Task<IActionResult> GetThread(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var messages = await VisibleMessages(userId)
            .Where(m => m.SenderUserId == otherUserId || m.ReceiverUserId == otherUserId)
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        var unread = messages.Where(m => m.ReceiverUserId == userId && !m.IsRead).ToList();
        if (unread.Count > 0)
        {
            foreach (var message in unread)
            {
                message.IsRead = true;
            }

            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            messages = messages.Select(m => new
            {
                m.Id,
                m.SenderUserId,
                m.ReceiverUserId,
                m.Subject,
                m.Content,
                m.IsRead,
                m.SentAt,
            }),
            iBlockedThem = await _context.BlockedUsers.AnyAsync(b =>
                b.BlockerId == userId && b.BlockedId == otherUserId
            ),
            theyBlockedMe = await _context.BlockedUsers.AnyAsync(b =>
                b.BlockerId == otherUserId && b.BlockedId == userId
            ),
        });
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageRequest request)
    {
        var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId))
        {
            return Unauthorized();
        }

        var receiverId = request.ReceiverUserId.Trim();

        if (string.IsNullOrWhiteSpace(receiverId))
        {
            return BadRequest(new { message = "A recipient is required." });
        }

        if (receiverId == senderId)
        {
            return BadRequest(new { message = "You cannot send a message to yourself." });
        }

        var content = request.Content.Trim();
        if (content.Length == 0)
        {
            return BadRequest(new { message = "Message content is required." });
        }

        var receiver = await _userManager.FindByIdAsync(receiverId);
        if (receiver is null)
        {
            return NotFound(new { message = "Recipient not found." });
        }

        var isBlocked = await _context.BlockedUsers.AnyAsync(b =>
            (b.BlockerId == receiverId && b.BlockedId == senderId)
            || (b.BlockerId == senderId && b.BlockedId == receiverId)
        );

        if (isBlocked)
        {
            return BadRequest(new { message = "Messaging is blocked between you and this user." });
        }

        _context.Messages.Add(
            new Message
            {
                SenderUserId = senderId,
                ReceiverUserId = receiverId,
                JobApplicationId = request.JobApplicationId,
                Subject = request.Subject.Trim(),
                Content = content,
                SentAt = DateTime.UtcNow,
            }
        );

        _context.Notifications.Add(
            new Notification
            {
                UserId = receiverId,
                Title = "New message",
                Message = string.IsNullOrWhiteSpace(request.Subject)
                    ? "You received a new message."
                    : $"You received a new message: {request.Subject.Trim()}",
                Type = NotificationTypes.Message,
                LinkUrl = "/messages",
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();

        return Ok(new { message = "Message sent successfully." });
    }

    /// <summary>
    /// Hides a conversation for the caller only. The rows are removed once both
    /// participants have deleted them.
    /// </summary>
    [HttpDelete("conversation/{otherUserId}")]
    public async Task<IActionResult> DeleteConversation(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var messages = await _context
            .Messages.Where(m =>
                (m.SenderUserId == userId && m.ReceiverUserId == otherUserId)
                || (m.SenderUserId == otherUserId && m.ReceiverUserId == userId)
            )
            .ToListAsync();

        foreach (var message in messages)
        {
            if (message.SenderUserId == userId)
            {
                message.DeletedBySender = true;
            }
            else
            {
                message.DeletedByReceiver = true;
            }
        }

        var invisibleToBoth = messages.Where(m => m is { DeletedBySender: true, DeletedByReceiver: true });
        _context.Messages.RemoveRange(invisibleToBoth);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Conversation deleted." });
    }

    [HttpPost("block/{otherUserId}")]
    public async Task<IActionResult> BlockUser(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (userId == otherUserId)
        {
            return BadRequest(new { message = "You cannot block yourself." });
        }

        var alreadyBlocked = await _context.BlockedUsers.AnyAsync(b =>
            b.BlockerId == userId && b.BlockedId == otherUserId
        );

        if (alreadyBlocked)
        {
            return Ok(new { message = "User already blocked." });
        }

        _context.BlockedUsers.Add(new BlockedUser { BlockerId = userId, BlockedId = otherUserId });
        await _context.SaveChangesAsync();

        return Ok(new { message = "User blocked." });
    }

    [HttpDelete("block/{otherUserId}")]
    public async Task<IActionResult> UnblockUser(string otherUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var block = await _context.BlockedUsers.FirstOrDefaultAsync(b =>
            b.BlockerId == userId && b.BlockedId == otherUserId
        );

        if (block is null)
        {
            return Ok(new { message = "User not blocked." });
        }

        _context.BlockedUsers.Remove(block);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User unblocked." });
    }

    [HttpGet("blocked-ids")]
    public async Task<IActionResult> GetBlockedIds()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var ids = await _context
            .BlockedUsers.Where(b => b.BlockerId == userId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        return Ok(ids);
    }

    /// <summary>Messages the caller is a party to and has not deleted on their side.</summary>
    private IQueryable<Message> VisibleMessages(string userId) =>
        _context.Messages.Where(m =>
            (m.SenderUserId == userId && !m.DeletedBySender)
            || (m.ReceiverUserId == userId && !m.DeletedByReceiver)
        );

    private static string DisplayName(
        string? firstName,
        string? lastName,
        string? companyName,
        string? email
    )
    {
        var name = $"{firstName} {lastName}".Trim();
        if (!string.IsNullOrWhiteSpace(name))
        {
            return name;
        }

        if (!string.IsNullOrWhiteSpace(companyName))
        {
            return companyName;
        }

        return string.IsNullOrWhiteSpace(email) ? "Unknown user" : email;
    }

    public class SendMessageRequest
    {
        [Required]
        public string ReceiverUserId { get; set; } = "";

        public int? JobApplicationId { get; set; }

        [MaxLength(200)]
        public string Subject { get; set; } = "";

        [Required]
        [MaxLength(5000)]
        public string Content { get; set; } = "";
    }
}
