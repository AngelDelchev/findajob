using findajob.Models;
using Microsoft.AspNetCore.Identity;

namespace findajob.Data;

public static class DbInitializer
{
    public static async Task SeedRolesAndAdminAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        string[] roleNames = { "Employer", "JobSeeker", "Admin" };

        foreach (var roleName in roleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Optional: Seed a default Admin account for testing
        string adminEmail = "monkeyinthehat@findajob.com";
        string adminUsername = "monkeyinthehat";
        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminUsername,
                Email = adminEmail,
                EmailConfirmed = true,
            };
            await userManager.CreateAsync(admin, "GetAjObScaMMEr69420LSD");
            await userManager.AddToRoleAsync(admin, "Admin");
        }
        string employerEmail = "boss@company.com";
        string employerUsername = "boss";
        var employer = await userManager.FindByEmailAsync(employerEmail);

        if (employer == null)
        {
            var newEmployer = new ApplicationUser
            {
                UserName = employerUsername,
                Email = employerEmail,
                EmailConfirmed = true,
            };

            await userManager.CreateAsync(newEmployer, "WouldYoULiKEaJoBiNMYCallCeNtER");
            await userManager.AddToRoleAsync(newEmployer, "Employer");
        }
    }
}
