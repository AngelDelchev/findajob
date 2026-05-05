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
public class ApplicationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly JobService _jobService;

    public ApplicationController(ApplicationDbContext context, JobService jobService)
    {
        _context = context;
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

    public class SetStatusRequest
    {
        public string Status { get; set; } = "Pending";
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] SetStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var app = await _context
            .JobApplications.Include(a => a.Job)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (app == null)
            return NotFound(new { message = "Application not found." });

        var isAdmin = User.IsInRole("Admin");
        var job = app.Job ?? await _context.JobPostings.IgnoreQueryFilters().FirstOrDefaultAsync(j => j.Id == app.JobId);
        
        if (!isAdmin && (job == null || job.OwnerId != userId))
            return Forbid();

        var allowed = new HashSet<string>(
            new[] { "Applied", "Reviewed", "Interviewing", "Accepted", "Rejected" }
        );
        if (!allowed.Contains(request.Status))
            return BadRequest(new { message = "Invalid status." });

        app.Status = request.Status;
        app.UpdatedAt = DateTime.UtcNow;

        _context.Notifications.Add(
            new Notification
            {
                UserId = app.UserId,
                Title = "Application update",
                Message = $"Your application for '{app.JobTitle}' was updated to: {request.Status}",
                Type = "Application",
                IsRead = false,
                LinkUrl = "/employee",
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();
        return Ok(new { message = "Status updated." });
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Withdraw(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var app = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (app == null)
            return NotFound(new { message = "Application not found." });

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && app.UserId != userId)
            return Forbid();

        _context.JobApplications.Remove(app);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Application withdrawn." });
    }

    [Authorize(Roles = "Employer,Admin")]
    [HttpGet("{id:int}/cv")]
    public async Task<IActionResult> GetCv(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var app = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (app == null)
            return NotFound(new { message = "Application not found." });

        var isAdmin = User.IsInRole("Admin");
        var job = await _context.JobPostings.IgnoreQueryFilters().FirstOrDefaultAsync(j => j.Id == app.JobId);
        
        if (!isAdmin && (job == null || job.OwnerId != userId))
            return Forbid();

        var cv = await _context.CvDocuments.FirstOrDefaultAsync(c => c.UserId == app.UserId);
        if (cv == null)
            return NotFound(new { message = "No CV found for this applicant." });

        return Ok(
            new
            {
                cv.Id,
                cv.FileName,
                Url = $"/uploads/cvs/{cv.StoredFileName}",
            }
        );
    }

    public class SubmitApplicationRequest
    {
        public int JobId { get; set; }
        public string ApplicantName { get; set; } = "";
        public string ApplicantEmail { get; set; } = "";
        public string Message { get; set; } = "";
    }
}
