using System.Linq;
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
public class AuthController : ControllerBase
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;

    public AuthController(
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IEmailService emailService,
        IPasswordHasher<ApplicationUser> passwordHasher
    )
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _context = context;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return BadRequest(new { message = "Email already exists." });
        }

        var pending = await _context.PendingRegistrations.FirstOrDefaultAsync(p => p.Email == request.Email);
        if (pending != null)
        {
            _context.PendingRegistrations.Remove(pending);
        }

        var newPending = new PendingRegistration
        {
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(null!, request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            City = request.City,
            PostalCode = request.PostalCode,
            Country = request.Country,
            CompanyName = request.CompanyName,
            ProfessionalTitle = request.ProfessionalTitle,
            Role = string.IsNullOrWhiteSpace(request.Role) ? "Employee" : request.Role,
            Token = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        _context.PendingRegistrations.Add(newPending);
        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendConfirmationEmailAsync(newPending.Email, newPending.Token);
        }
        catch (Exception ex)
        {
            // In a real app, we might want to handle this better, but for now we'll just log it.
            Console.WriteLine($"Failed to send email: {ex.Message}");
        }

        return Ok(new { message = "Please check your email to confirm your account." });
    }

    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string token)
    {
        var pending = await _context.PendingRegistrations.FirstOrDefaultAsync(p => p.Token == token);

        if (pending == null)
            return BadRequest(new { message = "Invalid or expired token." });

        if (pending.ExpiresAt < DateTime.UtcNow)
        {
            _context.PendingRegistrations.Remove(pending);
            await _context.SaveChangesAsync();
            return BadRequest(new { message = "Token has expired." });
        }

        var user = new ApplicationUser
        {
            UserName = pending.Email,
            Email = pending.Email,
            FirstName = pending.FirstName,
            LastName = pending.LastName,
            CompanyName = pending.CompanyName,
            ProfessionalTitle = pending.ProfessionalTitle,
            PasswordHash = pending.PasswordHash,
            EmailConfirmed = true,
        };

        var result = await _userManager.CreateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Account creation failed.", errors = result.Errors.Select(e => e.Description) });
        }

        await _userManager.AddToRoleAsync(user, pending.Role);

        _context.UserProfiles.Add(new UserProfile
        {
            UserId = user.Id,
            FirstName = pending.FirstName,
            LastName = pending.LastName,
            PhoneNumber = pending.PhoneNumber,
            ProfessionalTitle = pending.ProfessionalTitle,
            CompanyName = pending.CompanyName,
            Bio = "",
            AddressLine1 = pending.AddressLine1,
            AddressLine2 = pending.AddressLine2,
            City = pending.City,
            PostalCode = pending.PostalCode,
            Country = pending.Country,
            AvatarFileName = "",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _context.PendingRegistrations.Remove(pending);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Email confirmed! You can now log in." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var normalized = request.LoginName.ToUpper();

        var user = _userManager.Users.FirstOrDefault(u =>
            u.NormalizedEmail == normalized || u.NormalizedUserName == normalized
        );

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (!user.EmailConfirmed)
        {
            return Unauthorized(new { message = "Please confirm your email before logging in." });
        }

        var result = await _signInManager.PasswordSignInAsync(
            user.UserName!,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: false
        );

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(
            new
            {
                message = "Login successful.",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    roles,
                },
            }
        );
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(
            new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.CompanyName,
                user.ProfessionalTitle,
                roles,
            }
        );
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string ConfirmPassword { get; set; } = "";

        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string PhoneNumber { get; set; } = "";

        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string City { get; set; } = "";
        public string PostalCode { get; set; } = "";
        public string Country { get; set; } = "";

        public string Role { get; set; } = "Employee";

        public string CompanyName { get; set; } = "";
        public string ProfessionalTitle { get; set; } = "";
    }

    public class LoginRequest
    {
        public string LoginName { get; set; } = "";
        public string Password { get; set; } = "";
    }
}
