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
[Authorize]
public class ProfilesController : ControllerBase
{
    private const int MaxImageSizeBytes = 5 * 1024 * 1024;

    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IFileStorage _storage;

    public ProfilesController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IFileStorage storage
    )
    {
        _userManager = userManager;
        _context = context;
        _storage = storage;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

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
            AvatarUrl = BuildMediaUrl(FileStorageFolders.Avatars, profile?.AvatarFileName),
            BannerUrl = BuildMediaUrl(FileStorageFolders.Banners, profile?.BannerFileName),
            Experiences = await _context.Experiences.Where(e => e.UserId == userId).ToListAsync(),
            Educations = await _context.Educations.Where(e => e.UserId == userId).ToListAsync(),
            Skills = await _context.Skills.Where(s => s.UserId == userId).ToListAsync(),
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return NotFound();
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.CompanyName = request.CompanyName.Trim();
        user.ProfessionalTitle = request.ProfessionalTitle.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Profile update failed.",
                errors = result.Errors.Select(e => e.Description),
            });
        }

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null)
        {
            profile = new UserProfile { UserId = userId };
            _context.UserProfiles.Add(profile);
        }

        profile.FirstName = user.FirstName;
        profile.LastName = user.LastName;
        profile.PhoneNumber = user.PhoneNumber ?? "";
        profile.ProfessionalTitle = user.ProfessionalTitle ?? "";
        profile.CompanyName = user.CompanyName ?? "";
        profile.Bio = request.Bio.Trim();
        profile.CompanySize = request.CompanySize.Trim();
        profile.Industry = request.Industry.Trim();
        profile.TechStack = request.TechStack.Trim();
        profile.Benefits = request.Benefits.Trim();
        profile.AddressLine1 = request.AddressLine1.Trim();
        profile.AddressLine2 = request.AddressLine2.Trim();
        profile.City = request.City.Trim();
        profile.PostalCode = request.PostalCode.Trim();
        profile.Country = request.Country.Trim();
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
    }

    [HttpPost("avatar")]
    public Task<IActionResult> UploadAvatar([FromForm] IFormFile file) =>
        UploadImageAsync(file, FileStorageFolders.Avatars);

    [HttpPost("banner")]
    public Task<IActionResult> UploadBanner([FromForm] IFormFile file) =>
        UploadImageAsync(file, FileStorageFolders.Banners);

    /// <summary>
    /// Public directory of people and companies.
    ///
    /// Anonymous visitors are allowed because the site offers a "People" search before
    /// sign-in. Contact details are deliberately excluded: this endpoint used to return
    /// every user's email address and phone number, and to match on them, which turned
    /// it into a contact-harvesting tool for anyone with an account.
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> SearchProfiles(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _userManager.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(term)
                || u.LastName.ToLower().Contains(term)
                || (u.CompanyName != null && u.CompanyName.ToLower().Contains(term))
                || (u.ProfessionalTitle != null && u.ProfessionalTitle.ToLower().Contains(term))
            );
        }

        var total = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        // Everything is loaded in one round trip per table rather than per user.
        var profiles = await _context
            .UserProfiles.Where(p => userIds.Contains(p.UserId))
            .ToListAsync();
        var experiences = await _context
            .Experiences.Where(e => userIds.Contains(e.UserId))
            .ToListAsync();
        var educations = await _context
            .Educations.Where(e => userIds.Contains(e.UserId))
            .ToListAsync();
        var skills = await _context.Skills.Where(s => userIds.Contains(s.UserId)).ToListAsync();

        var items = users.Select(user =>
            BuildPublicProfile(
                user,
                profiles.FirstOrDefault(p => p.UserId == user.Id),
                experiences.Where(e => e.UserId == user.Id),
                educations.Where(e => e.UserId == user.Id),
                skills.Where(s => s.UserId == user.Id)
            )
        );

        return Ok(new
        {
            items,
            page,
            pageSize,
            total,
            totalPages = (int)Math.Ceiling(total / (double)pageSize),
        });
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfile(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(
            BuildPublicProfile(
                user,
                await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == id),
                await _context.Experiences.Where(e => e.UserId == id).ToListAsync(),
                await _context.Educations.Where(e => e.UserId == id).ToListAsync(),
                await _context.Skills.Where(s => s.UserId == id).ToListAsync()
            )
        );
    }

    // --- Experience ---------------------------------------------------------

    [HttpPost("experience")]
    public async Task<IActionResult> AddExperience([FromBody] Experience experience)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        experience.Id = 0;
        experience.UserId = userId;

        _context.Experiences.Add(experience);
        await _context.SaveChangesAsync();

        return Ok(experience);
    }

    [HttpDelete("experience/{id:int}")]
    public async Task<IActionResult> DeleteExperience(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var experience = await _context.Experiences.FirstOrDefaultAsync(e =>
            e.Id == id && e.UserId == userId
        );

        if (experience is null)
        {
            return NotFound();
        }

        _context.Experiences.Remove(experience);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Education ----------------------------------------------------------

    [HttpPost("education")]
    public async Task<IActionResult> AddEducation([FromBody] Education education)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        education.Id = 0;
        education.UserId = userId;

        _context.Educations.Add(education);
        await _context.SaveChangesAsync();

        return Ok(education);
    }

    [HttpDelete("education/{id:int}")]
    public async Task<IActionResult> DeleteEducation(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var education = await _context.Educations.FirstOrDefaultAsync(e =>
            e.Id == id && e.UserId == userId
        );

        if (education is null)
        {
            return NotFound();
        }

        _context.Educations.Remove(education);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Skills -------------------------------------------------------------

    [HttpPost("skill")]
    public async Task<IActionResult> AddSkill([FromBody] Skill skill)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var name = skill.Name.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return BadRequest(new { message = "A skill name is required." });
        }

        var alreadyExists = await _context.Skills.AnyAsync(s =>
            s.UserId == userId && s.Name.ToLower() == name.ToLower()
        );

        if (alreadyExists)
        {
            return BadRequest(new { message = "That skill is already on your profile." });
        }

        var entity = new Skill { UserId = userId, Name = name };
        _context.Skills.Add(entity);
        await _context.SaveChangesAsync();

        return Ok(entity);
    }

    [HttpDelete("skill/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var skill = await _context.Skills.FirstOrDefaultAsync(s =>
            s.Id == id && s.UserId == userId
        );

        if (skill is null)
        {
            return NotFound();
        }

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Helpers ------------------------------------------------------------

    private static string? BuildMediaUrl(string folder, string? fileName) =>
        string.IsNullOrEmpty(fileName) ? null : $"/uploads/{folder}/{fileName}";

    private static object BuildPublicProfile(
        ApplicationUser user,
        UserProfile? profile,
        IEnumerable<Experience> experiences,
        IEnumerable<Education> educations,
        IEnumerable<Skill> skills
    ) =>
        new
        {
            id = user.Id,
            firstName = user.FirstName,
            lastName = user.LastName,
            companyName = string.IsNullOrEmpty(user.CompanyName)
                ? profile?.CompanyName ?? ""
                : user.CompanyName,
            professionalTitle = user.ProfessionalTitle ?? "",
            bio = profile?.Bio ?? "",
            city = profile?.City ?? "",
            country = profile?.Country ?? "",
            avatarUrl = BuildMediaUrl(FileStorageFolders.Avatars, profile?.AvatarFileName),
            bannerUrl = BuildMediaUrl(FileStorageFolders.Banners, profile?.BannerFileName),
            companySize = profile?.CompanySize ?? "",
            industry = profile?.Industry ?? "",
            techStack = profile?.TechStack ?? "",
            benefits = profile?.Benefits ?? "",
            experiences = experiences.Select(e => new
            {
                id = e.Id,
                title = e.Title,
                company = e.Company,
                startDate = e.StartDate,
                endDate = e.EndDate,
                isCurrent = e.IsCurrent,
                description = e.Description,
            }),
            educations = educations.Select(e => new
            {
                id = e.Id,
                school = e.School,
                degree = e.Degree,
                fieldOfStudy = e.FieldOfStudy,
                startYear = e.StartYear,
                endYear = e.EndYear,
            }),
            skills = skills.Select(s => new { id = s.Id, name = s.Name }),
        };

    private async Task<IActionResult> UploadImageAsync(IFormFile file, string folder)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        if (file.Length > MaxImageSizeBytes)
        {
            return BadRequest(new { message = "The image must be 5 MB or smaller." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only JPG, PNG, and WEBP files are allowed." });
        }

        await using var stream = file.OpenReadStream();
        var fileName = await _storage.SaveAsync(folder, file.FileName, stream);

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null)
        {
            profile = new UserProfile { UserId = userId };
            _context.UserProfiles.Add(profile);
        }

        var previous = folder == FileStorageFolders.Avatars
            ? profile.AvatarFileName
            : profile.BannerFileName;

        if (folder == FileStorageFolders.Avatars)
        {
            profile.AvatarFileName = fileName;
        }
        else
        {
            profile.BannerFileName = fileName;
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Only remove the previous file once the new one is safely recorded, and never
        // remove a bundled seed asset, which several demo accounts can share.
        if (!string.IsNullOrEmpty(previous) && !SeedAssets.IsSeedAvatar(previous))
        {
            _storage.Delete(folder, previous);
        }

        return Ok(new { message = $"{folder} updated.", url = $"/uploads/{folder}/{fileName}" });
    }

    public class UpdateProfileRequest
    {
        [MaxLength(100)]
        public string FirstName { get; set; } = "";

        [MaxLength(100)]
        public string LastName { get; set; } = "";

        [MaxLength(150)]
        public string CompanyName { get; set; } = "";

        [MaxLength(150)]
        public string ProfessionalTitle { get; set; } = "";

        [MaxLength(40)]
        public string PhoneNumber { get; set; } = "";

        [MaxLength(4000)]
        public string Bio { get; set; } = "";

        [MaxLength(60)]
        public string CompanySize { get; set; } = "";

        [MaxLength(120)]
        public string Industry { get; set; } = "";

        [MaxLength(500)]
        public string TechStack { get; set; } = "";

        [MaxLength(500)]
        public string Benefits { get; set; } = "";

        [MaxLength(200)]
        public string AddressLine1 { get; set; } = "";

        [MaxLength(200)]
        public string AddressLine2 { get; set; } = "";

        [MaxLength(100)]
        public string City { get; set; } = "";

        [MaxLength(20)]
        public string PostalCode { get; set; } = "";

        [MaxLength(100)]
        public string Country { get; set; } = "";
    }
}
