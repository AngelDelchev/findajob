using Bogus;
using findajob.Controllers;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

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

        // 3. Add Tech Companies (Employers)
        var companies = new Dictionary<string, (string bio, string avatar)>
        {
            {
                "Google",
                (
                    "Our mission is to organize the world's information and make it universally accessible and useful. We are constantly innovating to build products that improve the lives of billions of people around the globe. Join us to tackle complex challenges and build technologies that shape the future.",
                    "google.webp"
                )
            },
            {
                "Microsoft",
                (
                    "Our mission is to empower every person and every organization on the planet to achieve more. We build platforms and tools that foster creativity, productivity, and connection. Come build with us and help create solutions that drive global impact.",
                    "microsoft.png"
                )
            },
            {
                "Sony",
                (
                    "Our purpose is to fill the world with emotion, through the power of creativity and technology. We pioneer new forms of entertainment and deliver groundbreaking hardware and software experiences. Be part of a team that brings imagination to life.",
                    "sony.jpg"
                )
            },
            {
                "Samsung",
                (
                    "We inspire the world and shape the future with transformative ideas and technologies. From industry-leading mobile devices to cutting-edge consumer electronics, we are dedicated to pushing the boundaries of what is possible.",
                    "samsung.svg"
                )
            },
            {
                "Apple",
                (
                    "We are dedicated to making the best products on earth, and to leaving the world better than we found it. Through the seamless integration of hardware, software, and services, we create magical experiences for our users. Join us in doing the best work of your life.",
                    "apple.png"
                )
            },
            {
                "Arasaka",
                (
                    "We are the global leader in enterprise solutions, dedicated to streamlining operations and maximizing efficiency. With a relentless focus on scale and synergy, we provide the foundational services that keep modern businesses running. Join us in building the corporate infrastructure of tomorrow.",
                    ""
                )
            },
        };

        var employerUsers = new List<ApplicationUser>();
        var context = serviceProvider.GetRequiredService<ApplicationDbContext>();

        foreach (var company in companies)
        {
            var companyName = company.Key;
            var bio = company.Value.bio;
            var avatar = company.Value.avatar;

            var email = $"{companyName.ToLower().Replace(" ", "")}@example.com";
            var existingUser = await userManager.FindByEmailAsync(email);

            ApplicationUser userToUse;

            if (existingUser == null)
            {
                var newUser = new ApplicationUser
                {
                    UserName = companyName.ToLower().Replace(" ", ""),
                    Email = email,
                    EmailConfirmed = true,
                    CompanyName = companyName,
                };
                var result = await userManager.CreateAsync(
                    newUser,
                    "1WouldYoULiKEaJoBiNMYCallCeNtER!"
                );
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(newUser, "Employer");
                    userToUse = newUser;
                }
                else
                {
                    continue;
                }
            }
            else
            {
                userToUse = existingUser;
            }

            employerUsers.Add(userToUse);

            // Ensure UserProfile exists with Bio and Avatar
            var profile = await context.UserProfiles.FirstOrDefaultAsync(p =>
                p.UserId == userToUse.Id
            );
            if (profile == null)
            {
                profile = new UserProfile
                {
                    UserId = userToUse.Id,
                    CompanyName = companyName,
                    Bio = bio,
                    AvatarFileName = avatar,
                };
                context.UserProfiles.Add(profile);
            }
            else
            {
                profile.Bio = bio;
                profile.AvatarFileName = avatar;
                context.UserProfiles.Update(profile);
            }
        }
        await context.SaveChangesAsync();

        // 4. Seed Bogus Jobs (Always clear and recreate for these employers)

        var seedEmployerIds = employerUsers.Select(e => e.Id).ToList();
        var oldJobs = await context
            .JobPostings.Where(j => seedEmployerIds.Contains(j.OwnerId))
            .ToListAsync();

        if (oldJobs.Any())
        {
            Console.WriteLine($">>> SEED: Clearing {oldJobs.Count} old Bogus Jobs...");
            context.JobPostings.RemoveRange(oldJobs);
            await context.SaveChangesAsync();
        }

        if (employerUsers.Any())
        {
            Console.WriteLine(">>> SEED: Generating new Bogus Jobs...");

            var tags = new[]
            {
                "React",
                "C#",
                ".NET",
                "Java",
                "Python",
                "SQL",
                "Azure",
                "AWS",
                "Docker",
                "Node.js",
                "TypeScript",
            };
            var dbTags = new List<Tag>();
            foreach (var t in tags)
            {
                var tag = await context.Tags.FirstOrDefaultAsync(x => x.Name == t);
                if (tag == null)
                {
                    tag = new Tag { Name = t };
                    context.Tags.Add(tag);
                }
                dbTags.Add(tag);
            }
            await context.SaveChangesAsync();

            var jobFaker = new Faker();
            var jobCount = jobFaker.Random.Number(200, 300);

            var faker = new Faker<JobPosting>()
                .RuleFor(j => j.Title, f => f.Name.JobTitle())
                .RuleFor(
                    j => j.Description,
                    (f, j) =>
                        $"We are looking for a {j.Title} to join our team. You will be responsible for {f.Company.Bs()} and helping us {f.Company.CatchPhrase().ToLower()}. If you are passionate about building {f.Hacker.Adjective()} systems, apply now!"
                )
                .RuleFor(j => j.CompanyDescription, f => f.Company.CatchPhrase())
                .RuleFor(
                    j => j.Salary,
                    f => $"${f.Random.Number(40, 150)}k - ${f.Random.Number(150, 250)}k"
                )
                .RuleFor(j => j.Location, f => $"{f.Address.City()}, {f.Address.Country()}")
                .RuleFor(j => j.JobType, f => f.PickRandom("Full-time", "Part-time", "Contract"))
                .RuleFor(j => j.WorkMode, f => f.PickRandom("Remote", "On-site", "Hybrid"))
                .RuleFor(j => j.EmploymentType, f => f.PickRandom("Permanent", "Temporary"))
                .RuleFor(
                    j => j.SeniorityLevel,
                    f => f.PickRandom("Junior", "Mid", "Senior", "Lead")
                )
                .RuleFor(
                    j => j.Requirements,
                    f =>
                        $"- {f.Random.Number(2, 7)} years of experience.\n- Strong knowledge of {f.Hacker.Abbreviation()} and {f.Hacker.Noun()}.\n- Ability to {f.Company.Bs()}."
                )
                .RuleFor(
                    j => j.Responsibilities,
                    f =>
                        $"- Design and implement {f.Hacker.Adjective()} solutions.\n- Collaborate with the team to {f.Company.Bs()}.\n- Maintain and improve {f.Hacker.Noun()} systems."
                )
                .RuleFor(
                    j => j.Benefits,
                    f =>
                        "Competitive salary, 401(k) matching, health insurance, paid time off, and remote work flexibility."
                )
                .RuleFor(j => j.PostedDate, f => f.Date.Recent(30).ToUniversalTime())
                .RuleFor(j => j.CreatedAt, (f, j) => j.PostedDate)
                .RuleFor(j => j.Deadline, f => f.Date.Future(30).ToUniversalTime());

            var jobs = new List<JobPosting>();
            for (int i = 0; i < jobCount; i++)
            {
                var employer = jobFaker.PickRandom(employerUsers);
                var job = faker.Generate();
                job.Company = employer.CompanyName;
                job.OwnerId = employer.Id;
                jobs.Add(job);
            }

            await context.JobPostings.AddRangeAsync(jobs);
            await context.SaveChangesAsync();

            var tagFaker = new Faker();
            foreach (var job in jobs)
            {
                var numTags = tagFaker.Random.Number(1, 4);
                var pickedTags = tagFaker.PickRandom(dbTags, numTags);
                foreach (var tag in pickedTags)
                {
                    if (!job.JobPostingTags.Any(t => t.TagId == tag.Id))
                    {
                        job.JobPostingTags.Add(
                            new JobPostingTag { JobPostingId = job.Id, TagId = tag.Id }
                        );
                    }
                }
            }
            await context.SaveChangesAsync();

            Console.WriteLine($">>> SEED: {jobCount} Bogus Jobs created successfully!");
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
