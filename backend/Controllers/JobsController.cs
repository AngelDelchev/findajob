using System.Security.Claims;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly JobService _jobService;

    public JobsController(JobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var jobs = string.IsNullOrWhiteSpace(search)
            ? await _jobService.GetJobsAsync()
            : await _jobService.SearchJobsAsync(search);

        return Ok(jobs);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var job = await _jobService.GetJobByIdAsync(id);
        if (job == null)
        {
            return NotFound(new { message = "Job not found." });
        }

        return Ok(job);
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JobPosting job)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        job.OwnerId = userId;
        job.CreatedAt = DateTime.UtcNow;
        job.PostedDate = DateTime.UtcNow;

        await _jobService.CreateJobAsync(job);
        return Ok(new { message = "Job created successfully." });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] JobPosting job)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        job.Id = id;
        var isAdmin = User.IsInRole("Admin");

        var success = await _jobService.UpdateJobAsync(job, userId, isAdmin);
        if (!success)
        {
            return NotFound(new { message = "Job not found or access denied." });
        }

        return Ok(new { message = "Job updated successfully." });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var isAdmin = User.IsInRole("Admin");
        await _jobService.DeleteJobAsync(id, userId, isAdmin);

        return Ok(new { message = "Job deleted successfully." });
    }

    [Authorize(Roles = "Employer")]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var jobs = await _jobService.GetJobsByOwnerAsync(userId);
        return Ok(jobs);
    }
}
