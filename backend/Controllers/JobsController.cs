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
    public async Task<IActionResult> GetJobs(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = JobService.DefaultPageSize,
        CancellationToken cancellationToken = default
    )
    {
        var result = await _jobService.SearchJobsAsync(search, page, pageSize, cancellationToken);

        return Ok(new
        {
            items = result.Items,
            page = result.Page,
            pageSize = result.PageSize,
            total = result.Total,
            totalPages = result.TotalPages,
        });
    }

    /// <summary>
    /// The vocabularies the job form offers. Serving them from the API keeps the UI
    /// from hard-coding lists that can drift away from what the server accepts.
    /// </summary>
    [HttpGet("metadata")]
    public IActionResult GetMetadata() =>
        Ok(new
        {
            jobTypes = JobConstants.JobTypes,
            workModes = JobConstants.WorkModes,
            employmentTypes = JobConstants.EmploymentTypes,
            seniorityLevels = JobConstants.SeniorityLevels,
            applicationStatuses = ApplicationStatus.All,
        });

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetJob(int id, CancellationToken cancellationToken)
    {
        var job = await _jobService.GetJobByIdAsync(id, cancellationToken);
        if (job is null)
        {
            return NotFound(new { message = "Job not found." });
        }

        return Ok(job);
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] JobRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var job = request.ToEntity();
        job.OwnerId = userId;
        job.IsDeleted = false;

        if (string.IsNullOrWhiteSpace(job.Company))
        {
            var profile = await _context.UserProfiles.FirstOrDefaultAsync(
                p => p.UserId == userId,
                cancellationToken
            );

            if (profile is not null)
            {
                job.Company = profile.CompanyName;
                job.CompanyDescription = profile.Bio;
            }
        }

        await _jobService.CreateJobAsync(job, cancellationToken);

        return CreatedAtAction(
            nameof(GetJob),
            new { id = job.Id },
            new { message = "Job created successfully.", jobId = job.Id }
        );
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateJob(
        int id,
        [FromBody] JobRequest request,
        CancellationToken cancellationToken
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var job = request.ToEntity();
        job.Id = id;

        var updated = await _jobService.UpdateJobAsync(
            job,
            userId,
            User.IsInRole(Roles.Admin),
            cancellationToken
        );

        if (!updated)
        {
            return NotFound(new { message = "Job not found or access denied." });
        }

        return Ok(new { message = "Job updated successfully." });
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteJob(int id, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var deleted = await _jobService.DeleteJobAsync(
            id,
            userId,
            User.IsInRole(Roles.Admin),
            cancellationToken
        );

        if (!deleted)
        {
            return NotFound(new { message = "Job not found or access denied." });
        }

        return Ok(new { message = "Job archived." });
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyJobs(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        return Ok(await _jobService.GetJobsByOwnerAsync(userId, cancellationToken));
    }

    [Authorize(Roles = Roles.AdminOrEmployer)]
    [HttpPut("{id:int}/visibility")]
    public async Task<IActionResult> SetVisibility(
        int id,
        [FromBody] SetVisibilityRequest request,
        CancellationToken cancellationToken
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var updated = await _jobService.SetJobVisibilityAsync(
            id,
            userId,
            User.IsInRole(Roles.Admin),
            request.IsDeleted,
            cancellationToken
        );

        if (!updated)
        {
            return NotFound(new { message = "Job not found or access denied." });
        }

        return Ok(new { message = request.IsDeleted ? "Job archived." : "Job restored." });
    }

    public class SetVisibilityRequest
    {
        public bool IsDeleted { get; set; }
    }

    /// <summary>
    /// Explicit write model. Binding straight to <see cref="JobPosting"/> let a caller
    /// set <c>Id</c>, <c>OwnerId</c>, <c>IsDeleted</c> and <c>CreatedAt</c> from the
    /// request body.
    /// </summary>
    public class JobRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = "";

        [MaxLength(150)]
        public string Company { get; set; } = "";

        [MaxLength(4000)]
        public string CompanyDescription { get; set; } = "";

        [Required]
        [MaxLength(10000)]
        public string Description { get; set; } = "";

        [MaxLength(200)]
        public string Location { get; set; } = "";

        [MaxLength(100)]
        public string Salary { get; set; } = "";

        [MaxLength(50)]
        public string JobType { get; set; } = "Full-time";

        [MaxLength(50)]
        public string WorkMode { get; set; } = "";

        [MaxLength(50)]
        public string EmploymentType { get; set; } = "";

        [MaxLength(50)]
        public string SeniorityLevel { get; set; } = "";

        [MaxLength(5000)]
        public string Requirements { get; set; } = "";

        [MaxLength(5000)]
        public string Responsibilities { get; set; } = "";

        [MaxLength(5000)]
        public string Benefits { get; set; } = "";

        public DateTime? Deadline { get; set; }

        public List<string> Tags { get; set; } = [];

        public JobPosting ToEntity() =>
            new()
            {
                Title = Title.Trim(),
                Company = Company.Trim(),
                CompanyDescription = CompanyDescription.Trim(),
                Description = Description.Trim(),
                Location = Location.Trim(),
                Salary = Salary.Trim(),
                JobType = string.IsNullOrWhiteSpace(JobType) ? "Full-time" : JobType.Trim(),
                WorkMode = WorkMode.Trim(),
                EmploymentType = EmploymentType.Trim(),
                SeniorityLevel = SeniorityLevel.Trim(),
                Requirements = Requirements.Trim(),
                Responsibilities = Responsibilities.Trim(),
                Benefits = Benefits.Trim(),
                Deadline = Deadline,
                Tags = Tags,
            };
    }
}
