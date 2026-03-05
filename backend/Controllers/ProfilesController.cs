using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfilesController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfilesController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(
            new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.CompanyName,
                user.ProfessionalTitle,
                user.PhoneNumber,
            }
        );
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.CompanyName = request.CompanyName;
        user.ProfessionalTitle = request.ProfessionalTitle;
        user.PhoneNumber = request.PhoneNumber;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(
                new
                {
                    message = "Profile update failed.",
                    errors = result.Errors.Select(e => e.Description),
                }
            );
        }

        return Ok(new { message = "Profile updated successfully." });
    }

    public class UpdateProfileRequest
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string ProfessionalTitle { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
    }
}
