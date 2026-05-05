using System.Security.Claims;
using findajob.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var items = await _context
            .Notifications.Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(200)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.LinkUrl,
                n.CreatedAt,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var count = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var n = await _context.Notifications.FirstOrDefaultAsync(x =>
            x.Id == id && x.UserId == userId
        );
        if (n == null)
            return NotFound(new { message = "Notification not found." });

        n.IsRead = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Marked read." });
    }

    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var items = await _context
            .Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in items)
            n.IsRead = true;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Marked all read." });
    }
}
