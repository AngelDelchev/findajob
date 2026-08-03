using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly JobService _jobService;
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public JobsController(
        JobService jobService,
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager
    )
    {
        _jobService = jobService;
        _context = context;
        _userManager = userManager;
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
        job.IsDeleted = false;

        // An administrator may publish on an employer's behalf; anyone else owns what
        // they create. Without this every posting made from the administration screen
        // belonged to the administrator rather than to the company it was for.
        var owner = await ResolveOwnerAsync(request.OwnerId, userId, cancellationToken);
        if (owner is null)
        {
            return BadRequest(new { message = "The selected employer could not be found." });
        }

        job.OwnerId = owner;

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

        // Only an administrator can hand a posting to a different employer, and only by
        // asking for it; leaving OwnerId empty keeps the current owner.
        if (User.IsInRole(Roles.Admin) && !string.IsNullOrWhiteSpace(request.OwnerId))
        {
            var owner = await ResolveOwnerAsync(request.OwnerId, userId, cancellationToken);
            if (owner is null)
            {
                return BadRequest(new { message = "The selected employer could not be found." });
            }

            job.OwnerId = owner;
        }

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

    /// <summary>
    /// Works out who should own a posting. Returns the caller unless an administrator
    /// nominated somebody else, and <c>null</c> when that nomination is not a real
    /// employer — so the owner can never be set to an arbitrary id.
    /// </summary>
    private async Task<string?> ResolveOwnerAsync(
        string? requestedOwnerId,
        string callerId,
        CancellationToken cancellationToken
    )
    {
        if (!User.IsInRole(Roles.Admin) || string.IsNullOrWhiteSpace(requestedOwnerId))
        {
            return callerId;
        }

        var requested = requestedOwnerId.Trim();
        if (requested == callerId)
        {
            return callerId;
        }

        var candidate = await _context
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == requested, cancellationToken);

        if (candidate is null)
        {
            return null;
        }

        return await _userManager.IsInRoleAsync(candidate, Roles.Employer) ? candidate.Id : null;
    }

    public class SetVisibilityRequest
    {
        public bool IsDeleted { get; set; }
    }

    /// <summary>
    /// Explicit write model. Binding straight to <see cref="JobPosting"/> let a caller
    /// set <c>Id</c>, <c>OwnerId</c>, <c>IsDeleted</c> and <c>CreatedAt</c> from the
    /// request body.
    ///
    /// The four vocabulary fields are checked against <see cref="JobConstants"/> in
    /// <see cref="Validate"/>. They used to accept any string at all, so a posting could
    /// carry a job type or seniority the rest of the application does not recognise and
    /// no filter or dropdown can represent.
    /// </summary>
    public class JobRequest : IValidatableObject
    {
        /// <summary>
        /// The employer the posting belongs to. Honoured only for an administrator, and
        /// only when it names a real employer; everyone else owns what they create.
        /// </summary>
        public string? OwnerId { get; set; }

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

        /// <summary>
        /// Keeps the stored vocabularies to the values the API publishes at
        /// <c>/api/jobs/metadata</c>. Only <see cref="JobType"/> is mandatory; the other
        /// three are optional, so blank stays acceptable.
        /// </summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            static ValidationResult? Check(string value, string[] allowed, string field, bool optional)
            {
                var trimmed = value?.Trim() ?? string.Empty;

                if (trimmed.Length == 0)
                {
                    return optional
                        ? null
                        : new ValidationResult($"{field} is required.", [field]);
                }

                return allowed.Contains(trimmed)
                    ? null
                    : new ValidationResult(
                        $"{field} must be one of: {string.Join(", ", allowed)}.",
                        [field]
                    );
            }

            var results = new[]
            {
                Check(JobType, JobConstants.JobTypes, nameof(JobType), optional: false),
                Check(WorkMode, JobConstants.WorkModes, nameof(WorkMode), optional: true),
                Check(
                    EmploymentType,
                    JobConstants.EmploymentTypes,
                    nameof(EmploymentType),
                    optional: true
                ),
                Check(
                    SeniorityLevel,
                    JobConstants.SeniorityLevels,
                    nameof(SeniorityLevel),
                    optional: true
                ),
            };

            return results.Where(result => result is not null)!;
        }

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
