using System.ComponentModel.DataAnnotations;
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

    [Authorize(Roles = Roles.Employee)]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitApplicationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var job = await _jobService.GetJobByIdAsync(request.JobId);
        if (job is null)
        {
            return NotFound(new { message = "Job not found." });
        }

        if (job.Deadline is { } deadline && deadline < DateTime.UtcNow)
        {
            return BadRequest(new { message = "The deadline for this position has passed." });
        }

        // Nothing previously stopped the same person applying to a posting repeatedly.
        var alreadyApplied = await _context.JobApplications.AnyAsync(a =>
            a.UserId == userId && a.JobId == request.JobId
        );

        if (alreadyApplied)
        {
            return Conflict(new { message = "You have already applied for this position." });
        }

        var application = new JobApplication
        {
            UserId = userId,
            JobId = request.JobId,
            ApplicantName = request.ApplicantName.Trim(),
            ApplicantEmail = request.ApplicantEmail.Trim(),
            Message = request.Message.Trim(),
            JobTitle = job.Title,
            CompanyName = job.Company,
            Status = ApplicationStatus.Pending,
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.JobApplications.Add(application);

        // Let the employer know without having to poll their dashboard.
        _context.Notifications.Add(
            new Notification
            {
                UserId = job.OwnerId,
                Title = "New application",
                Message = $"{application.ApplicantName} applied for '{job.Title}'.",
                Type = NotificationTypes.Application,
                LinkUrl = "/employer",
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();

        return Ok(new { message = "Application submitted successfully.", application.Id });
    }

    [Authorize(Roles = Roles.Employee)]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        return Ok(await _jobService.GetApplicationsForUserAsync(userId));
    }

    [Authorize(Roles = Roles.Employer)]
    [HttpGet("employer")]
    public async Task<IActionResult> ForEmployer()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        return Ok(await _jobService.GetApplicationsForEmployerAsync(userId));
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] SetStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (!ApplicationStatus.IsValid(request.Status))
        {
            return BadRequest(new { message = "Invalid status." });
        }

        var application = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application is null)
        {
            return NotFound(new { message = "Application not found." });
        }

        if (!await CanManageAsync(application, userId))
        {
            return Forbid();
        }

        application.Status = request.Status;
        application.UpdatedAt = DateTime.UtcNow;

        _context.Notifications.Add(
            new Notification
            {
                UserId = application.UserId,
                Title = "Application update",
                Message = $"Your application for '{application.JobTitle}' was updated to: {request.Status}",
                Type = NotificationTypes.Application,
                LinkUrl = "/employee",
                CreatedAt = DateTime.UtcNow,
            }
        );

        await _context.SaveChangesAsync();
        return Ok(new { message = "Status updated." });
    }

    [Authorize(Roles = Roles.AdminOrEmployee)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Withdraw(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var application = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application is null)
        {
            return NotFound(new { message = "Application not found." });
        }

        if (application.UserId != userId && !User.IsInRole(Roles.Admin))
        {
            return Forbid();
        }

        _context.JobApplications.Remove(application);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Application withdrawn." });
    }

    /// <summary>
    /// Returns a link to the applicant's CV.
    ///
    /// The URL now points at the authorised <see cref="CvController"/> endpoint. It
    /// used to be a direct path into <c>wwwroot</c>, which the static-file middleware
    /// served to anybody, signed in or not.
    /// </summary>
    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpGet("{id:int}/cv")]
    public async Task<IActionResult> GetCv(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var application = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application is null)
        {
            return NotFound(new { message = "Application not found." });
        }

        if (!await CanManageAsync(application, userId))
        {
            return Forbid();
        }

        var cv = await _context
            .CvDocuments.Where(c => c.UserId == application.UserId)
            .OrderByDescending(c => c.IsPrimary)
            .ThenByDescending(c => c.UploadedAt)
            .FirstOrDefaultAsync();

        if (cv is null)
        {
            return NotFound(new { message = "This applicant has not uploaded a CV." });
        }

        return Ok(new
        {
            cv.Id,
            cv.FileName,
            Url = $"/api/cv/{cv.Id}/content",
        });
    }

    /// <summary>An administrator, or the employer who owns the posting.</summary>
    private async Task<bool> CanManageAsync(JobApplication application, string userId)
    {
        if (User.IsInRole(Roles.Admin))
        {
            return true;
        }

        return await _context
            .JobPostings.IgnoreQueryFilters()
            .AnyAsync(j => j.Id == application.JobId && j.OwnerId == userId);
    }

    public class SubmitApplicationRequest
    {
        public int JobId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ApplicantName { get; set; } = "";

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string ApplicantEmail { get; set; } = "";

        [MaxLength(5000)]
        public string Message { get; set; } = "";
    }

    public class SetStatusRequest
    {
        public string Status { get; set; } = ApplicationStatus.Pending;
    }
}
