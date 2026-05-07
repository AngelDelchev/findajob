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
        string[] roles = { "Admin", "Employer", "Employee" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // 2. Add monkey (Admin)
        var monkeyByEmail = await userManager.FindByEmailAsync("monkey@findajob.com");
        var monkeyByName = await userManager.FindByNameAsync("monkey");

        if (monkeyByEmail == null && monkeyByName == null)
        {
            var monkey = new ApplicationUser
            {
                UserName = "monkey",
                Email = "monkey@findajob.com",
                EmailConfirmed = true,
                CompanyName = "FindAJob Headquarters",
                ProfessionalTitle = "System Overlord",
            };

            var result = await userManager.CreateAsync(monkey, "1GetAjObScaMMErLSD!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(monkey, "Admin");
                Console.WriteLine(">>> SEED: Admin created successfully!");
            }
        }

        // 3. Add Boss (Employer)
        var bossByEmail = await userManager.FindByEmailAsync("boss@company.com");
        var bossByName = await userManager.FindByNameAsync("boss");

        if (bossByEmail == null && bossByName == null)
        {
            var boss = new ApplicationUser
            {
                UserName = "boss",
                Email = "boss@company.com",
                EmailConfirmed = true,
                CompanyName = "The Big Corp",
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
