using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IWebHostEnvironment _env;

    public class SetRolesRequest
    {
        public List<string> Roles { get; set; } = new();
    }

    public class SetUserStatusRequest
    {
        public bool Disabled { get; set; }
    }

    public class SetApplicationStatusRequest
    {
        public string Status { get; set; } = "Pending";
    }

    public AdminController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IWebHostEnvironment env
    )
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _env = env;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users.ToListAsync();
        var result = new List<object>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var isDisabled =
                user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            result.Add(
                new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.CompanyName,
                    user.ProfessionalTitle,
                    Roles = roles,
                    IsDisabled = isDisabled,
                }
            );
        }

        return Ok(result);
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> GetJobs()
    {
        var jobs = await _context
            .JobPostings.IgnoreQueryFilters()
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        return Ok(jobs);
    }

    [HttpGet("applications")]
    public async Task<IActionResult> GetApplications()
    {
        var applications = await _context
            .JobApplications.OrderByDescending(a => a.AppliedAt)
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _userManager.Users.CountAsync();
        var totalJobs = await _context.JobPostings.IgnoreQueryFilters().CountAsync();
        var activeJobs = await _context.JobPostings.CountAsync();
        var deletedJobs = await _context
            .JobPostings.IgnoreQueryFilters()
            .CountAsync(j => j.IsDeleted);
        var totalApplications = await _context.JobApplications.CountAsync();

        var employers = 0;
        var employees = 0;
        var admins = 0;

        var users = await _userManager.Users.ToListAsync();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);

            if (roles.Contains("Employer"))
                employers++;
            if (roles.Contains("Employee"))
                employees++;
            if (roles.Contains("Admin"))
                admins++;
        }

        return Ok(
            new
            {
                totalUsers,
                totalJobs,
                activeJobs,
                deletedJobs,
                totalApplications,
                employers,
                employees,
                admins,
            }
        );
    }

    [HttpPut("users/{id}/roles")]
    public async Task<IActionResult> SetUserRoles(string id, [FromBody] SetRolesRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        var allowed = new HashSet<string>(new[] { "Admin", "Employer", "Employee" });
        if (request.Roles.Any(r => !allowed.Contains(r)))
            return BadRequest(new { message = "Invalid role provided." });

        foreach (var role in request.Roles.Distinct())
            if (!await _roleManager.RoleExistsAsync(role))
                return BadRequest(new { message = $"Role does not exist: {role}" });

        var current = await _userManager.GetRolesAsync(user);

        var removeResult = await _userManager.RemoveFromRolesAsync(user, current);
        if (!removeResult.Succeeded)
            return BadRequest(
                new
                {
                    message = "Failed removing roles.",
                    errors = removeResult.Errors.Select(e => e.Description),
                }
            );

        var addResult = await _userManager.AddToRolesAsync(user, request.Roles.Distinct());
        if (!addResult.Succeeded)
            return BadRequest(
                new
                {
                    message = "Failed adding roles.",
                    errors = addResult.Errors.Select(e => e.Description),
                }
            );

        return Ok(new { message = "Roles updated." });
    }

    [HttpPut("users/{id}/status")]
    public async Task<IActionResult> SetUserStatus(
        string id,
        [FromBody] SetUserStatusRequest request
    )
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        await _userManager.SetLockoutEnabledAsync(user, true);

        if (request.Disabled)
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
        else
            await _userManager.SetLockoutEndDateAsync(user, null);

        return Ok(new { message = request.Disabled ? "User disabled." : "User enabled." });
    }

    [HttpDelete("applications/{id:int}")]
    public async Task<IActionResult> DeleteApplication(int id)
    {
        var app = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (app == null)
            return NotFound(new { message = "Application not found." });

        _context.JobApplications.Remove(app);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Application deleted." });
    }

    [HttpPut("applications/{id:int}/status")]
    public async Task<IActionResult> SetApplicationStatus(
        int id,
        [FromBody] SetApplicationStatusRequest request
    )
    {
        var app = await _context.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (app == null)
            return NotFound(new { message = "Application not found." });

        var allowed = new HashSet<string>(new[] { "Pending", "Reviewed", "Accepted", "Rejected" });
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

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        if (User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) == id)
            return BadRequest(new { message = "Admin cannot delete themselves." });

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
            return BadRequest(new { message = "Cannot delete another admin account (safety)." });

        var cvs = await _context.CvDocuments.Where(c => c.UserId == id).ToListAsync();
        foreach (var cv in cvs)
        {
            var filePath = Path.Combine(_env.WebRootPath, "uploads", "cvs", cv.StoredFileName);
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);
        }

        _context.CvDocuments.RemoveRange(cvs);
        _context.Notifications.RemoveRange(_context.Notifications.Where(n => n.UserId == id));
        _context.SavedJobs.RemoveRange(_context.SavedJobs.Where(s => s.UserId == id));
        _context.Messages.RemoveRange(
            _context.Messages.Where(m => m.SenderUserId == id || m.ReceiverUserId == id)
        );
        _context.JobApplications.RemoveRange(_context.JobApplications.Where(a => a.UserId == id));

        await _context.SaveChangesAsync();

        var deleteResult = await _userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            return BadRequest(
                new
                {
                    message = "Failed to delete user.",
                    errors = deleteResult.Errors.Select(e => e.Description),
                }
            );
        }

        return Ok(new { message = "User deleted." });
    }
}
