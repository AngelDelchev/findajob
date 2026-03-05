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
        {
            return Unauthorized();
        }

        var messages = await _context
            .Messages.Where(m => m.SenderUserId == userId || m.ReceiverUserId == userId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        return Ok(messages);
    }

    [HttpGet("thread/{otherUserId}")]
    public async Task<IActionResult> GetThread(string otherUserId)
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

        return Ok(messages);
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageRequest request)
    {
        var senderUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderUserId))
        {
            return Unauthorized();
        }

        var receiver = await _userManager.FindByIdAsync(request.ReceiverUserId);
        if (receiver == null)
        {
            return NotFound(new { message = "Receiver not found." });
        }

        var message = new Message
        {
            SenderUserId = senderUserId,
            ReceiverUserId = request.ReceiverUserId,
            JobApplicationId = request.JobApplicationId,
            Subject = request.Subject,
            Content = request.Content,
            IsRead = false,
            SentAt = DateTime.UtcNow,
        };

        _context.Messages.Add(message);

        var notification = new Notification
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
        };

        _context.Notifications.Add(notification);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Message sent successfully." });
    }

    public class SendMessageRequest
    {
        public string ReceiverUserId { get; set; } = "";
        public int? JobApplicationId { get; set; }
        public string Subject { get; set; } = "";
        public string Content { get; set; } = "";
    }
}
