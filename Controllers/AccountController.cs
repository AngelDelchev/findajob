using findajob.Models;
using Microsoft.AspNetCore.Antiforgery; // Add this
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace findajob.Controllers
{
    [Route("Account")]
    public class AccountController : Controller
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;

        public AccountController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager
        ) // Inject it here
        {
            _signInManager = signInManager;
            _userManager = userManager;
        }

        [HttpPost("Login")]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Login([FromForm] string email, [FromForm] string password)
        {
            var result = await _signInManager.PasswordSignInAsync(email, password, true, false);
            if (result.Succeeded)
            {
                var user = await _userManager.FindByEmailAsync(email);
                var roles = await _userManager.GetRolesAsync(user);

                // Smart Redirect based on Role
                if (roles.Contains("Employer"))
                    return LocalRedirect("/Employer/Dashboard");
                if (roles.Contains("Admin"))
                    return LocalRedirect("/ManageJobs");

                return LocalRedirect("/");
            }
            return Redirect("/Login?error=1");
        }

        [HttpPost("TerminalLogout")]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return LocalRedirect("/");
        }
    }
}
