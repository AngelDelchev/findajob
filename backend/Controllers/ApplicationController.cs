using System.Security.Claims;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly JobService _jobService;

    public ApplicationsController(JobService jobService)
    {
        _jobService = jobService;
    }

    [Authorize(Roles = "Employee")]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitApplicationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var job = await _jobService.GetJobByIdAsync(request.JobId);
        if (job == null)
        {
            return NotFound(new { message = "Job not found." });
        }

        var application = new JobApplication
        {
            UserId = userId,
            JobId = request.JobId,
            ApplicantName = request.ApplicantName,
            ApplicantEmail = request.ApplicantEmail,
            Message = request.Message,
            AppliedAt = DateTime.UtcNow,
            JobTitle = job.Title,
            CompanyName = job.Company,
        };

        await _jobService.SubmitApplicationAsync(application);
        return Ok(new { message = "Application submitted successfully." });
    }

    [Authorize(Roles = "Employee")]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var applications = await _jobService.GetApplicationsForUserAsync(userId);
        return Ok(applications);
    }

    [Authorize(Roles = "Employer")]
    [HttpGet("employer")]
    public async Task<IActionResult> ForEmployer()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var applications = await _jobService.GetApplicationsForEmployerAsync(userId);
        return Ok(applications);
    }

    public class SubmitApplicationRequest
    {
        public int JobId { get; set; }
        public string ApplicantName { get; set; } = "";
        public string ApplicantEmail { get; set; } = "";
        public string Message { get; set; } = "";
    }
}
