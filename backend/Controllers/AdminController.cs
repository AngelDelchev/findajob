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
[Authorize(Roles = Roles.Admin)]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IFileStorage _storage;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IFileStorage storage,
        ILogger<AdminController> logger
    )
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _storage = storage;
        _logger = logger;
    }

    /// <summary>
    /// Lists users with their roles. Roles are fetched with a single join rather than
    /// a <c>GetRolesAsync</c> call per user, which previously made this endpoint issue
    /// one query per row.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users.AsNoTracking().ToListAsync();
        var rolesByUser = await GetRolesByUserAsync();
        var now = DateTimeOffset.UtcNow;

        var result = users.Select(user => new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.CompanyName,
            user.ProfessionalTitle,
            Roles = rolesByUser.GetValueOrDefault(user.Id, []),
            IsDisabled = user.LockoutEnd.HasValue && user.LockoutEnd.Value > now,
        });

        return Ok(result);
    }

    /// <summary>
    /// Lists every posting, including archived ones.
    ///
    /// Tags are read from the join table. The previous version projected
    /// <c>JobPosting.Tags</c>, which is <c>[NotMapped]</c> and therefore always empty,
    /// so opening a job in the admin editor and saving it silently deleted every tag
    /// on that posting.
    /// </summary>
    [HttpGet("jobs")]
    public async Task<IActionResult> GetJobs()
    {
        var jobs = await _context
            .JobPostings.IgnoreQueryFilters()
            .AsNoTracking()
            .Include(j => j.JobPostingTags)
            .ThenInclude(jt => jt.Tag)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        var ownerIds = jobs.Select(j => j.OwnerId).Distinct().ToList();
        var owners = await _context
            .Users.AsNoTracking()
            .Where(u => ownerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.CompanyName);

        var result = jobs.Select(job => new
        {
            job.Id,
            job.Title,
            Company = string.IsNullOrEmpty(job.Company)
                ? owners.GetValueOrDefault(job.OwnerId) ?? ""
                : job.Company,
            job.Location,
            job.Salary,
            JobType = string.IsNullOrEmpty(job.JobType) ? "Full-time" : job.JobType,
            job.Description,
            job.IsDeleted,
            job.CreatedAt,
            Tags = job.JobPostingTags
                .Select(jt => jt.Tag?.Name ?? "")
                .Where(n => n.Length > 0)
                .ToList(),
        });

        return Ok(result);
    }

    [HttpGet("applications")]
    public async Task<IActionResult> GetApplications()
    {
        var applications = await _context
            .JobApplications.AsNoTracking()
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                a.JobId,
                a.JobTitle,
                a.CompanyName,
                a.ApplicantName,
                a.ApplicantEmail,
                a.Message,
                a.Status,
                a.AppliedAt,
                a.UpdatedAt,
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var rolesByUser = await GetRolesByUserAsync();

        return Ok(
            new
            {
                totalUsers = await _userManager.Users.CountAsync(),
                totalJobs = await _context.JobPostings.IgnoreQueryFilters().CountAsync(),
                activeJobs = await _context.JobPostings.CountAsync(),
                deletedJobs = await _context.JobPostings.IgnoreQueryFilters().CountAsync(j => j.IsDeleted),
                totalApplications = await _context.JobApplications.CountAsync(),
                employers = rolesByUser.Count(r => r.Value.Contains(Roles.Employer)),
                employees = rolesByUser.Count(r => r.Value.Contains(Roles.Employee)),
                admins = rolesByUser.Count(r => r.Value.Contains(Roles.Admin)),
            }
        );
    }

    /// <summary>
    /// Pending sign-ups awaiting email confirmation.
    ///
    /// Only presentational fields are returned. This used to serialise the whole
    /// entity, exposing each pending user's password hash and — more seriously —
    /// their confirmation token, which is enough to activate their account.
    /// </summary>
    [HttpGet("registrations")]
    public async Task<IActionResult> GetPendingRegistrations()
    {
        var registrations = await _context
            .PendingRegistrations.AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Email,
                p.FirstName,
                p.LastName,
                p.Role,
                p.CreatedAt,
                p.ExpiresAt,
            })
            .ToListAsync();

        return Ok(registrations);
    }

    [HttpDelete("registrations/{id}")]
    public async Task<IActionResult> DeleteRegistration(string id)
    {
        var registration = await _context.PendingRegistrations.FirstOrDefaultAsync(p => p.Id == id);
        if (registration is null)
        {
            return NotFound(new { message = "Registration request not found." });
        }

        _context.PendingRegistrations.Remove(registration);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Registration request deleted." });
    }

    [HttpPut("users/{id}/roles")]
    public async Task<IActionResult> SetUserRoles(string id, [FromBody] SetRolesRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        var requested = request.Roles.Distinct().ToList();

        if (requested.Any(r => !Roles.IsValid(r)))
        {
            return BadRequest(new { message = "Invalid role provided." });
        }

        // An administrator removing their own Admin role would lock themselves out of
        // this screen with no way back in.
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == id && !requested.Contains(Roles.Admin))
        {
            return BadRequest(new { message = "You cannot remove your own administrator role." });
        }

        foreach (var role in requested)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                return BadRequest(new { message = $"Role does not exist: {role}" });
            }
        }

        var current = await _userManager.GetRolesAsync(user);

        var removeResult = await _userManager.RemoveFromRolesAsync(user, current.Except(requested));
        if (!removeResult.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to update roles.",
                errors = removeResult.Errors.Select(e => e.Description),
            });
        }

        var addResult = await _userManager.AddToRolesAsync(user, requested.Except(current));
        if (!addResult.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to update roles.",
                errors = addResult.Errors.Select(e => e.Description),
            });
        }

        return Ok(new { message = "Roles updated." });
    }

    [HttpPut("users/{id}/status")]
    public async Task<IActionResult> SetUserStatus(string id, [FromBody] SetUserStatusRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (User.FindFirstValue(ClaimTypes.NameIdentifier) == id)
        {
            return BadRequest(new { message = "You cannot disable your own account." });
        }

        await _userManager.SetLockoutEnabledAsync(user, true);
        await _userManager.SetLockoutEndDateAsync(
            user,
            request.Disabled ? DateTimeOffset.UtcNow.AddYears(100) : null
        );

        return Ok(new { message = request.Disabled ? "User disabled." : "User enabled." });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();

        var email = request.Email.Trim();
        if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            var setEmail = await _userManager.SetEmailAsync(user, email);
            if (!setEmail.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Failed to update user.",
                    errors = setEmail.Errors.Select(e => e.Description),
                });
            }

            // The account was created with the email address as its user name, so the
            // two are kept in step to avoid a login that no longer matches.
            var setUserName = await _userManager.SetUserNameAsync(user, email);
            if (!setUserName.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Failed to update user.",
                    errors = setUserName.Errors.Select(e => e.Description),
                });
            }
        }

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to update user.",
                errors = result.Errors.Select(e => e.Description),
            });
        }

        // Keep the denormalised profile copy in step with the account.
        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == id);
        if (profile is not null)
        {
            profile.FirstName = user.FirstName;
            profile.LastName = user.LastName;
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "User updated." });
    }

    /// <summary>
    /// Permanently removes a user and everything that belongs to them.
    ///
    /// The previous version cleaned up only some tables, leaving orphaned experiences,
    /// education, skills, friendships, friend requests and block records pointing at an
    /// account that no longer existed.
    /// </summary>
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (User.FindFirstValue(ClaimTypes.NameIdentifier) == id)
        {
            return BadRequest(new { message = "You cannot delete your own account." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains(Roles.Admin))
        {
            return BadRequest(new { message = "Another administrator account cannot be deleted." });
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var cvs = await _context.CvDocuments.Where(c => c.UserId == id).ToListAsync();
        foreach (var cv in cvs)
        {
            _storage.Delete(FileStorageFolders.Cvs, cv.StoredFileName);
        }
        _context.CvDocuments.RemoveRange(cvs);

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == id);
        if (profile is not null)
        {
            if (!string.IsNullOrEmpty(profile.AvatarFileName) && !SeedAssets.IsSeedAvatar(profile.AvatarFileName))
            {
                _storage.Delete(FileStorageFolders.Avatars, profile.AvatarFileName);
            }

            if (!string.IsNullOrEmpty(profile.BannerFileName))
            {
                _storage.Delete(FileStorageFolders.Banners, profile.BannerFileName);
            }

            _context.UserProfiles.Remove(profile);
        }

        _context.Notifications.RemoveRange(_context.Notifications.Where(n => n.UserId == id));
        _context.SavedJobs.RemoveRange(_context.SavedJobs.Where(s => s.UserId == id));
        _context.JobApplications.RemoveRange(_context.JobApplications.Where(a => a.UserId == id));
        _context.Messages.RemoveRange(
            _context.Messages.Where(m => m.SenderUserId == id || m.ReceiverUserId == id)
        );
        _context.Experiences.RemoveRange(_context.Experiences.Where(e => e.UserId == id));
        _context.Educations.RemoveRange(_context.Educations.Where(e => e.UserId == id));
        _context.Skills.RemoveRange(_context.Skills.Where(s => s.UserId == id));
        _context.Friendships.RemoveRange(
            _context.Friendships.Where(f => f.UserId == id || f.FriendId == id)
        );
        _context.FriendRequests.RemoveRange(
            _context.FriendRequests.Where(f => f.SenderId == id || f.ReceiverId == id)
        );
        _context.BlockedUsers.RemoveRange(
            _context.BlockedUsers.Where(b => b.BlockerId == id || b.BlockedId == id)
        );
        _context.PendingRegistrations.RemoveRange(
            _context.PendingRegistrations.Where(p => p.Email == user.Email)
        );

        await _context.SaveChangesAsync();

        var deleteResult = await _userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            await transaction.RollbackAsync();
            return BadRequest(new
            {
                message = "Failed to delete user.",
                errors = deleteResult.Errors.Select(e => e.Description),
            });
        }

        await transaction.CommitAsync();
        _logger.LogInformation("Administrator deleted user {UserId}.", id);

        return Ok(new { message = "User deleted." });
    }

    [HttpPut("applications/{id:int}/status")]
    public async Task<IActionResult> SetApplicationStatus(
        int id,
        [FromBody] SetApplicationStatusRequest request
    )
    {
        var application = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application is null)
        {
            return NotFound(new { message = "Application not found." });
        }

        if (!ApplicationStatus.IsValid(request.Status))
        {
            return BadRequest(new { message = "Invalid status." });
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

    [HttpDelete("applications/{id:int}")]
    public async Task<IActionResult> DeleteApplication(int id)
    {
        var application = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application is null)
        {
            return NotFound(new { message = "Application not found." });
        }

        _context.JobApplications.Remove(application);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Application deleted." });
    }

    [HttpPut("jobs/{id:int}/visibility")]
    public async Task<IActionResult> SetJobVisibility(
        int id,
        [FromBody] SetJobVisibilityRequest request
    )
    {
        var job = await _context.JobPostings.IgnoreQueryFilters().FirstOrDefaultAsync(j => j.Id == id);
        if (job is null)
        {
            return NotFound(new { message = "Job not found." });
        }

        job.IsDeleted = request.IsDeleted;
        await _context.SaveChangesAsync();

        return Ok(new { message = request.IsDeleted ? "Job archived." : "Job restored." });
    }

    [HttpDelete("jobs/{id:int}")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var job = await _context.JobPostings.IgnoreQueryFilters().FirstOrDefaultAsync(j => j.Id == id);
        if (job is null)
        {
            return NotFound(new { message = "Job not found." });
        }

        // Saved jobs have no foreign key to the posting, so they are cleared explicitly
        // rather than being left behind as rows pointing at nothing.
        _context.SavedJobs.RemoveRange(_context.SavedJobs.Where(s => s.JobPostingId == id));
        _context.JobPostings.Remove(job);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Job deleted permanently." });
    }

    /// <summary>One query for the whole role map instead of one per user.</summary>
    private async Task<Dictionary<string, List<string>>> GetRolesByUserAsync()
    {
        var pairs = await (
            from userRole in _context.UserRoles
            join role in _context.Roles on userRole.RoleId equals role.Id
            select new { userRole.UserId, RoleName = role.Name! }
        ).ToListAsync();

        return pairs
            .GroupBy(p => p.UserId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.RoleName).ToList());
    }

    public class SetRolesRequest
    {
        public List<string> Roles { get; set; } = [];
    }

    public class SetUserStatusRequest
    {
        public bool Disabled { get; set; }
    }

    public class SetApplicationStatusRequest
    {
        public string Status { get; set; } = ApplicationStatus.Pending;
    }

    public class SetJobVisibilityRequest
    {
        public bool IsDeleted { get; set; }
    }

    public class UpdateUserRequest
    {
        [MaxLength(100)]
        public string FirstName { get; set; } = "";

        [MaxLength(100)]
        public string LastName { get; set; } = "";

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = "";
    }
}
