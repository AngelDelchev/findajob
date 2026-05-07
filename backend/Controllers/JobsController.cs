using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly JobService _jobService;
    private readonly ApplicationDbContext _context;

    public JobsController(JobService jobService, ApplicationDbContext context)
    {
        _jobService = jobService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetJobs([FromQuery] string? search)
    {
        var jobs = await _jobService.SearchJobsAsync(search ?? "");
        return Ok(jobs);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetJob(int id)
    {
        var job = await _jobService.GetJobByIdAsync(id);
        if (job == null)
            return NotFound(new { message = "Job not found." });

        return Ok(job);
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] JobPosting job)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        job.OwnerId = userId;
        job.PostedDate = DateTime.UtcNow;
        job.CreatedAt = DateTime.UtcNow;
        job.IsDeleted = false;

        // Only auto-populate if missing
        if (string.IsNullOrEmpty(job.Company))
        {
            var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile != null)
            {
                job.Company = profile.CompanyName;
                job.CompanyDescription = profile.Bio;
            }
        }

        await _jobService.CreateJobAsync(job);
        return Ok(new { message = "Job created successfully.", jobId = job.Id });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateJob(int id, [FromBody] JobPosting job)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        job.Id = id;
        var isAdmin = User.IsInRole("Admin");

        var success = await _jobService.UpdateJobAsync(job, userId, isAdmin);

        if (!success)
            return NotFound(new { message = "Job not found or access denied." });

        return Ok(new { message = "Job updated successfully." });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var success = await _jobService.DeleteJobAsync(id, userId, isAdmin);

        if (!success)
            return NotFound(new { message = "Job not found or access denied." });

        return Ok(new { message = "Job deleted successfully." });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyJobs()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        if (isAdmin)
        {
            return Ok(await _jobService.GetJobsAsync());
        }

        var jobs = await _jobService.GetJobsByOwnerAsync(userId);
        return Ok(jobs);
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPut("{id:int}/visibility")]
    public async Task<IActionResult> SetVisibility(int id, [FromBody] SetVisibilityRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var success = await _jobService.SetJobVisibilityAsync(id, userId, isAdmin, request.IsDeleted);

        if (!success)
            return NotFound(new { message = "Job not found or access denied." });

        return Ok(new { message = request.IsDeleted ? "Job archived." : "Job restored." });
    }

    public class SetVisibilityRequest
    {
        public bool IsDeleted { get; set; }
    }
}
