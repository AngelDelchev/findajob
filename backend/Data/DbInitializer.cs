using Bogus;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace findajob.Data;

/// <summary>
/// Creates the roles, the administrator account and a set of demo employers the
/// first time the application runs against an empty database.
///
/// Seeding is deliberately additive. The previous version deleted every posting
/// owned by a seeded employer on each start and regenerated them; because
/// <see cref="JobApplication"/> cascades on <c>JobId</c>, that silently destroyed
/// every application anyone had submitted and orphaned their saved jobs. Nothing
/// here deletes rows, profile content entered through the UI is never overwritten,
/// and demo postings are only generated when there are no postings at all.
/// </summary>
public static class DbInitializer
{
    private sealed record SeedCompany(string Name, string Bio, string Avatar);

    private static readonly SeedCompany[] Companies =
    [
        new(
            "Google",
            "Our mission is to organize the world's information and make it universally accessible and useful. We are constantly innovating to build products that improve the lives of billions of people around the globe. Join us to tackle complex challenges and build technologies that shape the future.",
            "google.svg"
        ),
        new(
            "Microsoft",
            "Our mission is to empower every person and every organization on the planet to achieve more. We build platforms and tools that foster creativity, productivity, and connection. Come build with us and help create solutions that drive global impact.",
            "microsoft.png"
        ),
        new(
            "Sony",
            "Our purpose is to fill the world with emotion, through the power of creativity and technology. We pioneer new forms of entertainment and deliver groundbreaking hardware and software experiences. Be part of a team that brings imagination to life.",
            "sony.jpg"
        ),
        new(
            "Samsung",
            "We inspire the world and shape the future with transformative ideas and technologies. From industry-leading mobile devices to cutting-edge consumer electronics, we are dedicated to pushing the boundaries of what is possible.",
            "samsung.svg"
        ),
        new(
            "Apple",
            "We are dedicated to making the best products on earth, and to leaving the world better than we found it. Through the seamless integration of hardware, software, and services, we create magical experiences for our users. Join us in doing the best work of your life.",
            "apple.png"
        ),
        new(
            "Arasaka",
            "We are the global leader in enterprise solutions, dedicated to streamlining operations and maximizing efficiency. With a relentless focus on scale and synergy, we provide the foundational services that keep modern businesses running. Join us in building the corporate infrastructure of tomorrow.",
            "arasaka.svg"
        ),
    ];

    private static readonly string[] SeedTags =
    [
        "React", "C#", ".NET", "Java", "Python", "SQL",
        "Azure", "AWS", "Docker", "Node.js", "TypeScript",
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        var logger = services
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(DbInitializer).FullName!);

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var context = services.GetRequiredService<ApplicationDbContext>();
        var storage = services.GetRequiredService<IFileStorage>();
        var environment = services.GetRequiredService<IHostEnvironment>();
        var options = services.GetRequiredService<IConfiguration>().GetSection("Seed");

        await SeedRolesAsync(roleManager);
        await SeedAdminAsync(userManager, options, logger);
        await ImportSeedAvatarsAsync(storage, environment);

        var employers = await SeedEmployersAsync(userManager, context, storage, options, logger);
        await SeedDemoJobsAsync(context, employers, logger);
    }

    /// <summary>
    /// Copies the bundled company logos into the upload store on first run. They ship
    /// with the application rather than living in the upload volume, which keeps
    /// application assets and user-uploaded files cleanly separated.
    /// </summary>
    private static async Task ImportSeedAvatarsAsync(IFileStorage storage, IHostEnvironment environment)
    {
        foreach (var company in Companies)
        {
            var source = Path.Combine(
                environment.ContentRootPath,
                SeedAssets.DirectoryName,
                FileStorageFolders.Avatars,
                company.Avatar
            );

            await storage.ImportIfMissingAsync(FileStorageFolders.Avatars, company.Avatar, source);
        }
    }

    private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    }

    private static async Task SeedAdminAsync(
        UserManager<ApplicationUser> userManager,
        IConfigurationSection options,
        ILogger logger
    )
    {
        var email = options["AdminEmail"] ?? "monkey@findajob.com";
        var userName = options["AdminUserName"] ?? "monkey";
        var password = options["AdminPassword"];

        if (await userManager.FindByEmailAsync(email) is not null
            || await userManager.FindByNameAsync(userName) is not null)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No Seed:AdminPassword is configured, so the administrator account was not created. "
                    + "Set it with `dotnet user-secrets set Seed:AdminPassword <value>` or the "
                    + "SEED__ADMINPASSWORD environment variable."
            );
            return;
        }

        var admin = new ApplicationUser
        {
            UserName = userName,
            Email = email,
            EmailConfirmed = true,
            CompanyName = "FindAJob Headquarters",
            ProfessionalTitle = "System Administrator",
        };

        var result = await userManager.CreateAsync(admin, password);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, Roles.Admin);
            logger.LogInformation("Seeded administrator account {Email}.", email);
        }
        else
        {
            logger.LogError(
                "Failed to seed the administrator account: {Errors}",
                string.Join("; ", result.Errors.Select(e => e.Description))
            );
        }
    }

    private static async Task<List<ApplicationUser>> SeedEmployersAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IFileStorage storage,
        IConfigurationSection options,
        ILogger logger
    )
    {
        var password = options["EmployerPassword"];
        var employers = new List<ApplicationUser>();

        foreach (var company in Companies)
        {
            var slug = company.Name.ToLowerInvariant().Replace(" ", string.Empty);
            var email = $"{slug}@example.com";
            var user = await userManager.FindByEmailAsync(email);

            if (user is null)
            {
                if (string.IsNullOrWhiteSpace(password))
                {
                    logger.LogWarning(
                        "No Seed:EmployerPassword is configured, so the demo employers were not created."
                    );
                    return employers;
                }

                user = new ApplicationUser
                {
                    UserName = slug,
                    Email = email,
                    EmailConfirmed = true,
                    CompanyName = company.Name,
                };

                var result = await userManager.CreateAsync(user, password);
                if (!result.Succeeded)
                {
                    logger.LogError(
                        "Failed to seed demo employer {Company}: {Errors}",
                        company.Name,
                        string.Join("; ", result.Errors.Select(e => e.Description))
                    );
                    continue;
                }

                await userManager.AddToRoleAsync(user, Roles.Employer);
                logger.LogInformation("Seeded demo employer {Email}.", email);
            }

            employers.Add(user);
            await EnsureEmployerProfileAsync(context, storage, user, company);
        }

        await context.SaveChangesAsync();
        return employers;
    }

    /// <summary>
    /// Creates the employer's profile when it is missing and otherwise only fills
    /// in fields that are still blank, so a bio or avatar set through the UI is not
    /// reset on the next restart.
    /// </summary>
    private static async Task EnsureEmployerProfileAsync(
        ApplicationDbContext context,
        IFileStorage storage,
        ApplicationUser user,
        SeedCompany company
    )
    {
        var profile = await context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

        if (profile is null)
        {
            profile = new UserProfile { UserId = user.Id, CompanyName = company.Name };
            context.UserProfiles.Add(profile);
        }

        if (string.IsNullOrWhiteSpace(profile.CompanyName))
        {
            profile.CompanyName = company.Name;
        }

        if (string.IsNullOrWhiteSpace(profile.Bio))
        {
            profile.Bio = company.Bio;
        }

        // Only reference a seeded avatar when the file is really there, otherwise the
        // UI renders a broken image instead of falling back to the initials avatar.
        if (string.IsNullOrWhiteSpace(profile.AvatarFileName)
            && storage.Exists(FileStorageFolders.Avatars, company.Avatar))
        {
            profile.AvatarFileName = company.Avatar;
        }
    }

    /// <summary>
    /// Generates demo postings, but only against a database that has none. This is
    /// what makes restarts safe, because applications and saved jobs reference these rows.
    /// </summary>
    private static async Task SeedDemoJobsAsync(
        ApplicationDbContext context,
        List<ApplicationUser> employers,
        ILogger logger
    )
    {
        if (employers.Count == 0)
        {
            return;
        }

        if (await context.JobPostings.IgnoreQueryFilters().AnyAsync())
        {
            logger.LogInformation("Job postings already exist, skipping demo job seeding.");
            return;
        }

        var tags = new List<Tag>();
        foreach (var name in SeedTags)
        {
            var tag = await context.Tags.FirstOrDefaultAsync(t => t.Name == name);
            if (tag is null)
            {
                tag = new Tag { Name = name };
                context.Tags.Add(tag);
            }
            tags.Add(tag);
        }
        await context.SaveChangesAsync();

        var random = new Faker();
        var jobFaker = new Faker<JobPosting>()
            .RuleFor(j => j.Title, f => f.Name.JobTitle())
            .RuleFor(
                j => j.Description,
                (f, j) =>
                    $"We are looking for a {j.Title} to join our team. You will be responsible for {f.Company.Bs()} and helping us {f.Company.CatchPhrase().ToLower()}. If you are passionate about building {f.Hacker.Adjective()} systems, apply now!"
            )
            .RuleFor(j => j.CompanyDescription, f => f.Company.CatchPhrase())
            .RuleFor(
                j => j.Salary,
                f =>
                {
                    var from = f.Random.Number(40, 120) * 1000;
                    var to = from + f.Random.Number(20, 90) * 1000;
                    return $"$ {from} - {to}";
                }
            )
            .RuleFor(j => j.Location, f => $"{f.Address.City()}, {f.Address.Country()}")
            .RuleFor(j => j.JobType, f => f.PickRandom(JobConstants.JobTypes))
            .RuleFor(j => j.WorkMode, f => f.PickRandom(JobConstants.WorkModes))
            .RuleFor(j => j.EmploymentType, f => f.PickRandom(JobConstants.EmploymentTypes))
            .RuleFor(j => j.SeniorityLevel, f => f.PickRandom(JobConstants.SeniorityLevels))
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
                _ =>
                    "Competitive salary, 401(k) matching, health insurance, paid time off, and remote work flexibility."
            )
            .RuleFor(j => j.PostedDate, f => f.Date.Recent(30).ToUniversalTime())
            .RuleFor(j => j.CreatedAt, (_, j) => j.PostedDate)
            .RuleFor(j => j.Deadline, f => f.Date.Future(30).ToUniversalTime());

        var count = random.Random.Number(200, 300);
        var jobs = new List<JobPosting>(count);

        for (var i = 0; i < count; i++)
        {
            var employer = random.PickRandom(employers);
            var job = jobFaker.Generate();

            job.Company = employer.CompanyName ?? string.Empty;
            job.OwnerId = employer.Id;
            job.JobPostingTags = random
                .PickRandom(tags, random.Random.Number(1, 4))
                .Select(tag => new JobPostingTag { TagId = tag.Id })
                .ToList();

            jobs.Add(job);
        }

        await context.JobPostings.AddRangeAsync(jobs);
        await context.SaveChangesAsync();

        logger.LogInformation("Seeded {Count} demo job postings.", count);
    }
}
