using findajob.Controllers;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Identity;

namespace findajob.Data;

public static class DbInitializer
{
    public static async Task SeedRolesAndUsers(IServiceProvider serviceProvider)
    {
        Console.WriteLine(">>> ATTEMPTING TO SEED NOW");
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        // 1. Ensure Roles exist
        string[] roles = { "Admin", "Employer", "User" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // 2. Add Monkey (Admin)
        var monkey = await userManager.FindByNameAsync("monkeyinthehat");
        if (monkey == null)
        {
            monkey = new ApplicationUser
            {
                UserName = "monkeyinthehat",
                Email = "monkeyinthehat@findajob.com",
                EmailConfirmed = true,
                CompanyName = "FindAJob Headquarters", // Setting custom prop
                ProfessionalTitle = "System Overlord", // Setting custom prop
            };

            var result = await userManager.CreateAsync(monkey, "1GetAjObScaMMErLSD!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(monkey, "Admin");
                Console.WriteLine(">>> SEED: Monkey created successfully!");
            }
            else
            {
                Console.WriteLine(
                    ">>> SEED ERROR (Monkey): "
                        + string.Join(", ", result.Errors.Select(e => e.Description))
                );
            }
        }

        // 3. Add Boss (Employer)
        var boss = await userManager.FindByNameAsync("boss");
        if (boss == null)
        {
            boss = new ApplicationUser
            {
                UserName = "boss",
                Email = "boss@company.com",
                EmailConfirmed = true,
                CompanyName = "The Big Corp", // Setting custom prop
            };
            var result = await userManager.CreateAsync(boss, "1WouldYoULiKEaJoBiNMYCallCeNtER!");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(boss, "Employer");
        }
    }

    private static async Task CreateUserWithRole(
        UserManager<ApplicationUser> userManager,
        string username,
        string email,
        string password,
        string role
    )
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            var newUser = new ApplicationUser
            {
                UserName = username, // Using your new variable here
                Email = email,
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(newUser, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(newUser, role);
            }
        }
    }
}
