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

    private const string ResetRequestedMessage =
        "If that address has an account, a link to reset the password is on its way.";

    private const string InvalidResetLinkMessage =
        "This password reset link is no longer valid. Please request a new one.";

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

    /// <summary>
    /// Starts a password reset.
    ///
    /// Answers the same way whether or not the address is registered, for the same
    /// reason <see cref="Register"/> does: otherwise this endpoint tells anyone who
    /// asks which addresses hold an account here.
    /// </summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var email = request.Email.Trim();
        var user = await _userManager.FindByEmailAsync(email);

        if (user is null)
        {
            _logger.LogInformation("Password reset requested for an address with no account.");
            return Ok(new { message = ResetRequestedMessage });
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email!, token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not send a password reset email.");
        }

        // Same reasoning as the registration flow: without a local SMTP server the link
        // is otherwise unreachable, so the feature could not be demonstrated.
        if (_environment.IsDevelopment())
        {
            return Ok(new { message = ResetRequestedMessage, developmentToken = token });
        }

        return Ok(new { message = ResetRequestedMessage });
    }

    /// <summary>
    /// Completes a password reset.
    ///
    /// A successful reset rotates the security stamp, which signs out every session the
    /// account had. That is the behaviour you want: if the reset happened because
    /// somebody else had the old password, their session dies with it.
    /// </summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (request.Password != request.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());

        // An unknown address and a bad token are reported identically, so this cannot be
        // used to probe for accounts either.
        if (user is null)
        {
            return BadRequest(new { message = InvalidResetLinkMessage });
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.Password);

        if (!result.Succeeded)
        {
            if (result.Errors.Any(e => e.Code == "InvalidToken"))
            {
                return BadRequest(new { message = InvalidResetLinkMessage });
            }

            return BadRequest(new
            {
                message = "Password does not meet the requirements.",
                errors = result.Errors.Select(e => e.Description),
            });
        }

        // Somebody who reset their password because they were locked out should not stay
        // locked out afterwards.
        await _userManager.SetLockoutEndDateAsync(user, null);
        await _userManager.ResetAccessFailedCountAsync(user);

        return Ok(new { message = "Your password has been changed. You can now log in." });
    }

    /// <summary>Changes the signed-in user's own password.</summary>
    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var result = await _userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            request.NewPassword
        );

        if (!result.Succeeded)
        {
            if (result.Errors.Any(e => e.Code == "PasswordMismatch"))
            {
                return BadRequest(new { message = "Your current password is not correct." });
            }

            return BadRequest(new
            {
                message = "Password does not meet the requirements.",
                errors = result.Errors.Select(e => e.Description),
            });
        }

        // Changing a password rotates the security stamp, which would otherwise sign the
        // user out of the tab they are sitting in. Every other session still ends.
        await _signInManager.RefreshSignInAsync(user);

        return Ok(new { message = "Your password has been changed." });
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

    public class ForgotPasswordRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = "";
    }

    public class ResetPasswordRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = "";

        [Required]
        public string Token { get; set; } = "";

        [Required]
        public string Password { get; set; } = "";

        [Required]
        public string ConfirmPassword { get; set; } = "";
    }

    public class ChangePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = "";

        [Required]
        public string NewPassword { get; set; } = "";

        [Required]
        public string ConfirmPassword { get; set; } = "";
    }
}
