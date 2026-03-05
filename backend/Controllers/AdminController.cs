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

    public AdminController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users.ToListAsync();

        var result = new List<object>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);

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
}
