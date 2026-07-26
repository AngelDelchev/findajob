using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string ConfirmationSentMessage =
        "If that address can be registered, a confirmation email is on its way.";

    private const string AccountReadyMessage = "Email confirmed! You can now log in.";

    private const string InvalidCredentialsMessage = "Invalid credentials.";

    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IEmailService emailService,
        IPasswordHasher<ApplicationUser> passwordHasher,
        IHostEnvironment environment,
        ILogger<AuthController> logger
    )
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _context = context;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
        _environment = environment;
        _logger = logger;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        var role = string.IsNullOrWhiteSpace(request.Role) ? Roles.Employee : request.Role.Trim();
        if (role is not (Roles.Employee or Roles.Employer))
        {
            // Only self-service roles may be requested; Admin is granted by an admin.
            return BadRequest(new { message = "Invalid account type." });
        }

        // The account is created later, in ConfirmEmail, through CreateAsync(user) with a
        // pre-computed hash. That overload runs user validators but NOT password
        // validators, so without this explicit check the configured password policy was
        // never enforced and any password at all was accepted.
        var passwordErrors = await ValidatePasswordAsync(request.Password);
        if (passwordErrors.Count > 0)
        {
            return BadRequest(new
            {
                message = "Password does not meet the requirements.",
                errors = passwordErrors,
            });
        }

        var email = request.Email.Trim();

        // Respond identically whether or not the address is taken, so this endpoint
        // cannot be used to discover who holds an account here.
        if (await _userManager.FindByEmailAsync(email) is not null)
        {
            _logger.LogInformation("Registration attempted for an address that already exists.");
            return Ok(new { message = ConfirmationSentMessage });
        }

        var existingPending = await _context.PendingRegistrations.FirstOrDefaultAsync(p =>
            p.Email == email
        );
        if (existingPending is not null)
        {
            _context.PendingRegistrations.Remove(existingPending);
        }

        var pending = new PendingRegistration
        {
            Email = email,
            PasswordHash = _passwordHasher.HashPassword(null!, request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            AddressLine1 = request.AddressLine1.Trim(),
            AddressLine2 = request.AddressLine2.Trim(),
            City = request.City.Trim(),
            PostalCode = request.PostalCode.Trim(),
            Country = request.Country.Trim(),
            CompanyName = request.CompanyName.Trim(),
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Role = role,
            Token = GenerateToken(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
        };

        _context.PendingRegistrations.Add(pending);
        await RemoveExpiredRegistrationsAsync();
        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendConfirmationEmailAsync(pending.Email, pending.Token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not send the confirmation email for a new registration.");
        }

        // Without a local SMTP server the confirmation link is otherwise unreachable,
        // which would make the sign-up flow impossible to demonstrate.
        if (_environment.IsDevelopment())
        {
            return Ok(new { message = ConfirmationSentMessage, developmentToken = pending.Token });
        }

        return Ok(new { message = ConfirmationSentMessage });
    }

    [HttpGet("confirm-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "Invalid or expired confirmation link." });
        }

        var pending = await _context.PendingRegistrations.FirstOrDefaultAsync(p => p.Token == token);
        if (pending is null)
        {
            return BadRequest(new { message = "Invalid or expired confirmation link." });
        }

        if (pending.ExpiresAt < DateTime.UtcNow)
        {
            _context.PendingRegistrations.Remove(pending);
            await _context.SaveChangesAsync();
            return BadRequest(new
            {
                message = "This confirmation link has expired. Please register again.",
            });
        }

        // Guards against a double click or a refreshed confirmation page.
        if (await _userManager.FindByEmailAsync(pending.Email) is not null)
        {
            _context.PendingRegistrations.Remove(pending);
            await _context.SaveChangesAsync();
            return Ok(new { message = AccountReadyMessage });
        }

        var user = new ApplicationUser
        {
            UserName = pending.Email,
            Email = pending.Email,
            FirstName = pending.FirstName,
            LastName = pending.LastName,
            CompanyName = pending.CompanyName,
            ProfessionalTitle = pending.ProfessionalTitle,
            PhoneNumber = pending.PhoneNumber,
            PasswordHash = pending.PasswordHash,
            EmailConfirmed = true,
        };

        var result = await _userManager.CreateAsync(user);
        if (!result.Succeeded)
        {
            if (result.Errors.Any(e => e.Code is "DuplicateUserName" or "DuplicateEmail"))
            {
                _context.PendingRegistrations.Remove(pending);
                await _context.SaveChangesAsync();
                return Ok(new { message = AccountReadyMessage });
            }

            _logger.LogError(
                "Could not create a confirmed account: {Errors}",
                string.Join("; ", result.Errors.Select(e => e.Description))
            );

            return BadRequest(new
            {
                message = "Account creation failed.",
                errors = result.Errors.Select(e => e.Description),
            });
        }

        await _userManager.AddToRoleAsync(user, pending.Role);

        _context.UserProfiles.Add(
            new UserProfile
            {
                UserId = user.Id,
                FirstName = pending.FirstName,
                LastName = pending.LastName,
                PhoneNumber = pending.PhoneNumber,
                ProfessionalTitle = pending.ProfessionalTitle,
                CompanyName = pending.CompanyName,
                AddressLine1 = pending.AddressLine1,
                AddressLine2 = pending.AddressLine2,
                City = pending.City,
                PostalCode = pending.PostalCode,
                Country = pending.Country,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }
        );

        _context.PendingRegistrations.Remove(pending);
        await _context.SaveChangesAsync();

        return Ok(new { message = AccountReadyMessage });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var normalized = _userManager.KeyNormalizer.NormalizeName(
            request.LoginName?.Trim() ?? string.Empty
        );

        var user = await _userManager.Users.FirstOrDefaultAsync(u =>
            u.NormalizedEmail == normalized || u.NormalizedUserName == normalized
        );

        if (user is null)
        {
            return Unauthorized(new { message = InvalidCredentialsMessage });
        }

        // lockoutOnFailure was previously false, which let an attacker guess passwords
        // indefinitely. Together with the "auth" rate-limit policy, repeated failures
        // now lock the account for fifteen minutes.
        var result = await _signInManager.PasswordSignInAsync(
            user.UserName!,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: true
        );

        if (result.IsLockedOut)
        {
            return StatusCode(
                StatusCodes.Status423Locked,
                new
                {
                    message = "This account is temporarily locked after too many failed attempts. Please try again later.",
                }
            );
        }

        if (result.IsNotAllowed && !user.EmailConfirmed)
        {
            return Unauthorized(new
            {
                message = "Please confirm your email address before logging in.",
            });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = InvalidCredentialsMessage });
        }

        return Ok(new { message = "Login successful.", user = await BuildCurrentUserAsync(user) });
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
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(await BuildCurrentUserAsync(user));
    }

    private async Task<object> BuildCurrentUserAsync(ApplicationUser user) =>
        new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.CompanyName,
            user.ProfessionalTitle,
            Roles = await _userManager.GetRolesAsync(user),
        };

    private async Task<List<string>> ValidatePasswordAsync(string password)
    {
        var errors = new List<string>();

        foreach (var validator in _userManager.PasswordValidators)
        {
            var result = await validator.ValidateAsync(
                _userManager,
                new ApplicationUser(),
                password
            );

            if (!result.Succeeded)
            {
                errors.AddRange(result.Errors.Select(e => e.Description));
            }
        }

        return errors.Distinct().ToList();
    }

    /// <summary>Cryptographically random, URL-safe confirmation token.</summary>
    private static string GenerateToken() =>
        Convert
            .ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

    /// <summary>Stops abandoned sign-ups from accumulating indefinitely.</summary>
    private async Task RemoveExpiredRegistrationsAsync()
    {
        var cutoff = DateTime.UtcNow;
        var expired = await _context
            .PendingRegistrations.Where(p => p.ExpiresAt < cutoff)
            .ToListAsync();

        if (expired.Count > 0)
        {
            _context.PendingRegistrations.RemoveRange(expired);
        }
    }

    public class RegisterRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = "";

        [Required]
        public string Password { get; set; } = "";

        [Required]
        public string ConfirmPassword { get; set; } = "";

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = "";

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = "";

        [MaxLength(40)]
        public string PhoneNumber { get; set; } = "";

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

        [MaxLength(150)]
        public string CompanyName { get; set; } = "";

        [MaxLength(150)]
        public string ProfessionalTitle { get; set; } = "";

        public string Role { get; set; } = Roles.Employee;
    }

    public class LoginRequest
    {
        [Required]
        public string LoginName { get; set; } = "";

        [Required]
        public string Password { get; set; } = "";
    }
}
