using System.Net.Http.Json;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace backend.tests;

/// <summary>
/// Runs the real application — the real pipeline, the real controllers, the real
/// authentication — against a throwaway SQLite database.
///
/// The unit tests cover services in isolation. Authorisation is not a service concern:
/// it lives in attributes and in the ownership checks inside the controllers, and until
/// now nothing exercised any of it. These tests do.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Filename=:memory:");

    private readonly string _uploadRoot = Path.Combine(
        Path.GetTempPath(),
        "findajob-tests",
        Guid.NewGuid().ToString("N")
    );

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // The database exists for as long as this connection is open.
        _connection.Open();

        // Development, so that HTTPS redirection stays off and the auth cookie is not
        // marked Secure — the test client speaks plain HTTP.
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration(
            (_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        // Blank passwords stop the seeder creating the demo administrator,
                        // the six employers and their few hundred Bogus postings, which
                        // would otherwise run for every test class.
                        ["Seed:AdminPassword"] = "",
                        ["Seed:EmployerPassword"] = "",
                        ["FileStorage:RootPath"] = _uploadRoot,
                        ["RateLimiting:Enabled"] = "false",
                    }
                )
        );

        builder.ConfigureServices(services =>
        {
            // Point both context registrations at the in-memory database.
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<IDbContextFactory<ApplicationDbContext>>();

            services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(_connection));
            services.AddDbContextFactory<ApplicationDbContext>(
                options => options.UseSqlite(_connection),
                ServiceLifetime.Scoped
            );
        });
    }

    /// <summary>Creates a confirmed account in the given role and returns its id.</summary>
    public async Task<string> CreateUserAsync(string email, string password, string role)
    {
        using var scope = Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        if (!await roles.RoleExistsAsync(role))
        {
            await roles.CreateAsync(new IdentityRole(role));
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
        };

        var created = await users.CreateAsync(user, password);
        Assert.True(created.Succeeded, string.Join("; ", created.Errors.Select(e => e.Description)));

        await users.AddToRoleAsync(user, role);
        return user.Id;
    }

    /// <summary>A client that has signed in and carries the session cookie.</summary>
    public async Task<HttpClient> SignInAsync(string email, string password)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false,
        });

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { loginName = email, password }
        );

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    /// <summary>An anonymous client.</summary>
    public HttpClient CreateAnonymousClient() =>
        CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false,
        });

    public async Task<T> WithDbAsync<T>(Func<ApplicationDbContext, Task<T>> work)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await work(context);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (!disposing)
        {
            return;
        }

        _connection.Dispose();

        if (Directory.Exists(_uploadRoot))
        {
            Directory.Delete(_uploadRoot, recursive: true);
        }
    }
}
