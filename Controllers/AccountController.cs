using findajob.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        public async Task<IActionResult> Login(
            [FromForm] string loginName,
            [FromForm] string password
        )
        {
            // Debug: List EVERY user currently in the DB
            var allUsers = await _userManager.Users.ToListAsync();
            Console.WriteLine($">>> DEBUG: DB contains {allUsers.Count} users.");
            foreach (var u in allUsers)
            {
                Console.WriteLine($">>> DEBUG: User: '{u.Email}' | Name: '{u.UserName}'");
            }

            // Use the DbContext directly to find the user by plain Email or UserName
            // This ignores the "Normalized" columns entirely
            var upperLogin = loginName.ToUpper();
            var user = await _userManager.Users.FirstOrDefaultAsync(u =>
                u.NormalizedEmail == loginName.ToUpper()
                || u.NormalizedUserName == loginName.ToUpper()
            );

            if (user == null)
            {
                Console.WriteLine(
                    $">>> LOGIN FAIL: Still can't find '{loginName}' in plain columns."
                );
                return Redirect("/Login?error=1");
            }

            // Now that we have the user object, let the Sign-In Manager check the password
            var result = await _signInManager.PasswordSignInAsync(
                user.UserName!,
                password,
                isPersistent: true,
                lockoutOnFailure: false
            );

            if (result.Succeeded)
            {
                Console.WriteLine($">>> LOGIN SUCCESS for: {user.UserName}");
                return Redirect("/ManageJobs");
            }

            // THIS WILL TELL US THE TRUTH:
            if (result.IsLockedOut)
                Console.WriteLine(">>> FAIL: User is locked out.");
            else if (result.IsNotAllowed)
                Console.WriteLine(">>> FAIL: Not allowed (Check EmailConfirmed!).");
            else if (result.RequiresTwoFactor)
                Console.WriteLine(">>> FAIL: 2FA required.");
            else
                Console.WriteLine(">>> FAIL: Invalid Password.");

            return Redirect("/Login?error=1");
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
