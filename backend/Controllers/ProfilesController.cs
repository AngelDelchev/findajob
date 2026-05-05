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
[Authorize]
public class ProfilesController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public ProfilesController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IWebHostEnvironment environment
    )
    {
        _userManager = userManager;
        _context = context;
        _environment = environment;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return Unauthorized();

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        
        var experiences = await _context.Experiences.Where(e => e.UserId == userId).ToListAsync();
        var educations = await _context.Educations.Where(e => e.UserId == userId).ToListAsync();
        var skills = await _context.Skills.Where(s => s.UserId == userId).ToListAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.CompanyName,
            user.ProfessionalTitle,
            user.PhoneNumber,
            Bio = profile?.Bio ?? "",
            CompanySize = profile?.CompanySize ?? "",
            Industry = profile?.Industry ?? "",
            TechStack = profile?.TechStack ?? "",
            Benefits = profile?.Benefits ?? "",
            AddressLine1 = profile?.AddressLine1 ?? "",
            AddressLine2 = profile?.AddressLine2 ?? "",
            City = profile?.City ?? "",
            PostalCode = profile?.PostalCode ?? "",
            Country = profile?.Country ?? "",
            AvatarUrl = string.IsNullOrEmpty(profile?.AvatarFileName) ? null : $"/uploads/avatars/{profile.AvatarFileName}",
            BannerUrl = string.IsNullOrEmpty(profile?.BannerFileName) ? null : $"/uploads/banners/{profile.BannerFileName}",
            Experiences = experiences,
            Educations = educations,
            Skills = skills
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound();

        // Update User table properties
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.CompanyName = request.CompanyName;
        user.ProfessionalTitle = request.ProfessionalTitle;
        user.PhoneNumber = request.PhoneNumber;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Profile update failed.", errors = result.Errors.Select(e => e.Description) });
        }

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new UserProfile { UserId = userId };
            _context.UserProfiles.Add(profile);
        }

        profile.FirstName = request.FirstName;
        profile.LastName = request.LastName;
        profile.PhoneNumber = request.PhoneNumber;
        profile.ProfessionalTitle = request.ProfessionalTitle;
        profile.CompanyName = request.CompanyName;
        profile.Bio = request.Bio;
        profile.CompanySize = request.CompanySize;
        profile.Industry = request.Industry;
        profile.TechStack = request.TechStack;
        profile.Benefits = request.Benefits;
        profile.AddressLine1 = request.AddressLine1;
        profile.AddressLine2 = request.AddressLine2;
        profile.City = request.City;
        profile.PostalCode = request.PostalCode;
        profile.Country = request.Country;
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
    }

    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
    {
        return await UploadImage(file, "avatars");
    }

    [HttpPost("banner")]
    public async Task<IActionResult> UploadBanner([FromForm] IFormFile file)
    {
        return await UploadImage(file, "banners");
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchProfiles([FromQuery] string? search)
    {
        var term = (search ?? "").ToLower();
        
        // Search in Identity users
        IQueryable<ApplicationUser> query = _userManager.Users;

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(u => u.FirstName.ToLower().Contains(term) 
                                 || u.LastName.ToLower().Contains(term) 
                                 || u.Email.ToLower().Contains(term)
                                 || (u.PhoneNumber != null && u.PhoneNumber.Contains(term)));
        }

        var users = await query.Take(20).ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        // Join with profiles for extra info
        var profiles = await _context.UserProfiles
            .Where(p => userIds.Contains(p.UserId))
            .ToListAsync();

        var results = users.Select(user => {
            var p = profiles.FirstOrDefault(prof => prof.UserId == user.Id);
            return new {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.PhoneNumber,
                user.CompanyName,
                user.ProfessionalTitle,
                Bio = p?.Bio ?? "",
                City = p?.City ?? "",
                Country = p?.Country ?? "",
                AvatarUrl = string.IsNullOrEmpty(p?.AvatarFileName) ? null : $"/uploads/avatars/{p.AvatarFileName}",
                BannerUrl = string.IsNullOrEmpty(p?.BannerFileName) ? null : $"/uploads/banners/{p.BannerFileName}",
                CompanySize = p?.CompanySize ?? "",
                Industry = p?.Industry ?? "",
                TechStack = p?.TechStack ?? "",
                Benefits = p?.Benefits ?? ""
            };
        });

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == id);
        
        return Ok(new {
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.CompanyName,
            user.ProfessionalTitle,
            Bio = profile?.Bio ?? "",
            City = profile?.City ?? "",
            Country = profile?.Country ?? "",
            AvatarUrl = string.IsNullOrEmpty(profile?.AvatarFileName) ? null : $"/uploads/avatars/{profile.AvatarFileName}",
            BannerUrl = string.IsNullOrEmpty(profile?.BannerFileName) ? null : $"/uploads/banners/{profile.BannerFileName}",
            CompanySize = profile?.CompanySize ?? "",
            Industry = profile?.Industry ?? "",
            TechStack = profile?.TechStack ?? "",
            Benefits = profile?.Benefits ?? ""
        });
    }

    private async Task<IActionResult> UploadImage(IFormFile file, string folder)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only JPG, PNG, and WEBP files are allowed." });
        }

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{userId}_{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new UserProfile { UserId = userId };
            _context.UserProfiles.Add(profile);
        }

        if (folder == "avatars")
        {
            if (!string.IsNullOrEmpty(profile.AvatarFileName))
            {
                var oldPath = Path.Combine(uploadsFolder, profile.AvatarFileName);
                if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
            }
            profile.AvatarFileName = fileName;
        }
        else
        {
            if (!string.IsNullOrEmpty(profile.BannerFileName))
            {
                var oldPath = Path.Combine(uploadsFolder, profile.BannerFileName);
                if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
            }
            profile.BannerFileName = fileName;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"{folder} updated.", url = $"/uploads/{folder}/{fileName}" });
    }

    // --- Experience CRUD ---
    [HttpPost("experience")]
    public async Task<IActionResult> AddExperience([FromBody] Experience exp)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        exp.Id = 0;
        exp.UserId = userId;
        _context.Experiences.Add(exp);
        await _context.SaveChangesAsync();
        return Ok(exp);
    }

    [HttpDelete("experience/{id:int}")]
    public async Task<IActionResult> DeleteExperience(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var exp = await _context.Experiences.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exp == null) return NotFound();

        _context.Experiences.Remove(exp);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // --- Education CRUD ---
    [HttpPost("education")]
    public async Task<IActionResult> AddEducation([FromBody] Education edu)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        edu.Id = 0;
        edu.UserId = userId;
        _context.Educations.Add(edu);
        await _context.SaveChangesAsync();
        return Ok(edu);
    }

    [HttpDelete("education/{id:int}")]
    public async Task<IActionResult> DeleteEducation(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var edu = await _context.Educations.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (edu == null) return NotFound();

        _context.Educations.Remove(edu);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // --- Skill CRUD ---
    [HttpPost("skill")]
    public async Task<IActionResult> AddSkill([FromBody] Skill skill)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        skill.Id = 0;
        skill.UserId = userId;
        _context.Skills.Add(skill);
        await _context.SaveChangesAsync();
        return Ok(skill);
    }

    [HttpDelete("skill/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var skill = await _context.Skills.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (skill == null) return NotFound();

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();
        return Ok();
    }

    public class UpdateProfileRequest
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string ProfessionalTitle { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
        public string Bio { get; set; } = "";
        public string CompanySize { get; set; } = "";
        public string Industry { get; set; } = "";
        public string TechStack { get; set; } = "";
        public string Benefits { get; set; } = "";
        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string City { get; set; } = "";
        public string PostalCode { get; set; } = "";
        public string Country { get; set; } = "";
    }
}
