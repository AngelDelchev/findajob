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

        public AccountController(SignInManager<ApplicationUser> signInManager) =>
            _signInManager = signInManager;

        [HttpPost("Login")]
        [IgnoreAntiforgeryToken] // <--- THIS KILLS THE ERROR
        public async Task<IActionResult> Login([FromForm] string email, [FromForm] string password)
        {
            var result = await _signInManager.PasswordSignInAsync(
                email,
                password,
                isPersistent: true,
                lockoutOnFailure: false
            );

            if (result.Succeeded)
            {
                // Force a hard redirect back to the root
                return LocalRedirect("/");
            }

            return Redirect("/Account/Login?error=1");
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
