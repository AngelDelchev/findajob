using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Employee)]
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
        {
            return Unauthorized();
        }

        // A left join, so an entry whose posting was hard-deleted still appears (marked
        // unavailable) rather than silently vanishing from the list.
        var items = await (
            from saved in _context.SavedJobs.AsNoTracking()
            where saved.UserId == userId
            join job in _context.JobPostings.IgnoreQueryFilters()
                on saved.JobPostingId equals job.Id
                into matches
            from job in matches.DefaultIfEmpty()
            orderby saved.SavedAt descending
            select new
            {
                saved.Id,
                saved.JobPostingId,
                saved.SavedAt,
                Job = job == null
                    ? null
                    : new
                    {
                        job.Id,
                        job.Title,
                        job.Company,
                        job.Location,
                        job.Salary,
                        job.JobType,
                        job.IsDeleted,
                    },
            }
        ).ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveJobRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (!await _context.JobPostings.AnyAsync(j => j.Id == request.JobId))
        {
            return NotFound(new { message = "Job not found." });
        }

        var already = await _context.SavedJobs.AnyAsync(s =>
            s.UserId == userId && s.JobPostingId == request.JobId
        );

        if (already)
        {
            return Ok(new { message = "Already saved." });
        }

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
        {
            return Unauthorized();
        }

        var saved = await _context.SavedJobs.FirstOrDefaultAsync(s =>
            s.UserId == userId && s.JobPostingId == jobId
        );

        if (saved is null)
        {
            return NotFound(new { message = "Not saved." });
        }

        _context.SavedJobs.Remove(saved);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Removed." });
    }

    public class SaveJobRequest
    {
        public int JobId { get; set; }
    }
}
