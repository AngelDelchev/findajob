using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Employee")]
public class SavedJobsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SavedJobsController(ApplicationDbContext context)
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
            .SavedJobs.Where(s => s.UserId == userId)
            .OrderByDescending(s => s.SavedAt)
            .Join(
                _context.JobPostings,
                s => s.JobPostingId,
                j => j.Id,
                (s, j) =>
                    new
                    {
                        s.Id,
                        s.JobPostingId,
                        s.SavedAt,
                        j.Title,
                        j.Company,
                        j.Location,
                        j.Salary,
                    }
            )
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveJobRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var jobExists = await _context.JobPostings.AnyAsync(j => j.Id == request.JobId);
        if (!jobExists)
            return NotFound(new { message = "Job not found." });

        var already = await _context.SavedJobs.AnyAsync(s =>
            s.UserId == userId && s.JobPostingId == request.JobId
        );
        if (already)
            return Ok(new { message = "Already saved." });

        _context.SavedJobs.Add(
            new SavedJob
            {
                UserId = userId,
                JobPostingId = request.JobId,
                SavedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();
        return Ok(new { message = "Saved." });
    }

    [HttpDelete("{jobId:int}")]
    public async Task<IActionResult> Unsave(int jobId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var item = await _context.SavedJobs.FirstOrDefaultAsync(s =>
            s.UserId == userId && s.JobPostingId == jobId
        );
        if (item == null)
            return NotFound(new { message = "Not saved." });

        _context.SavedJobs.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Removed." });
    }

    public class SaveJobRequest
    {
        public int JobId { get; set; }
    }
}
