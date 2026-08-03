using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using findajob.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.tests;

/// <summary>
/// The password reset and change flows, and the rule that only an administrator can
/// decide which employer a posting belongs to.
/// </summary>
public class PasswordAndOwnershipTests : IClassFixture<ApiFactory>
{
    private const string Password = "TestPassw0rd!";
    private const string NewPassword = "AnotherPassw0rd!";

    private readonly ApiFactory _factory;

    public PasswordAndOwnershipTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static string UniqueEmail(string prefix) => $"{prefix}-{Guid.NewGuid():N}@example.com";

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    /// <summary>
    /// In Development the reset token comes back in the response, so the flow can be
    /// exercised without a mail server — the same affordance the registration flow has.
    /// </summary>
    private async Task<string> RequestResetTokenAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await BodyAsync(response)).GetProperty("developmentToken").GetString()!;
    }

    // --- Reset --------------------------------------------------------------

    [Fact]
    public async Task AResetTokenLetsSomebodyChooseANewPasswordAndSignInWithIt()
    {
        var email = UniqueEmail("reset");
        await _factory.CreateUserAsync(email, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();
        var token = await RequestResetTokenAsync(client, email);

        var reset = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email,
                token,
                password = NewPassword,
                confirmPassword = NewPassword,
            }
        );

        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        // The new password works...
        var signedIn = await _factory.SignInAsync(email, NewPassword);
        Assert.Equal(HttpStatusCode.OK, (await signedIn.GetAsync("/api/auth/me")).StatusCode);

        // ...and the old one does not.
        var stale = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { loginName = email, password = Password }
        );

        Assert.Equal(HttpStatusCode.Unauthorized, stale.StatusCode);
    }

    [Fact]
    public async Task AResetTokenCannotBeUsedTwice()
    {
        var email = UniqueEmail("reset-once");
        await _factory.CreateUserAsync(email, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();
        var token = await RequestResetTokenAsync(client, email);

        object Body() =>
            new
            {
                email,
                token,
                password = NewPassword,
                confirmPassword = NewPassword,
            };

        Assert.Equal(
            HttpStatusCode.OK,
            (await client.PostAsJsonAsync("/api/auth/reset-password", Body())).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/auth/reset-password", Body())).StatusCode
        );
    }

    [Fact]
    public async Task AResetTokenIssuedForOneAccountIsUselessAgainstAnother()
    {
        var victim = UniqueEmail("victim");
        var attacker = UniqueEmail("attacker");
        await _factory.CreateUserAsync(victim, Password, Roles.Employee);
        await _factory.CreateUserAsync(attacker, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();
        var attackerToken = await RequestResetTokenAsync(client, attacker);

        var response = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email = victim,
                token = attackerToken,
                password = NewPassword,
                confirmPassword = NewPassword,
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // The victim's password is untouched.
        var stillWorks = await _factory.SignInAsync(victim, Password);
        Assert.Equal(HttpStatusCode.OK, (await stillWorks.GetAsync("/api/auth/me")).StatusCode);
    }

    /// <summary>
    /// Asking to reset an address that has no account has to look exactly like asking
    /// for one that does, or this becomes a way to enumerate accounts.
    /// </summary>
    [Fact]
    public async Task ForgotPasswordSaysTheSameThingForAnAddressWithNoAccount()
    {
        var known = UniqueEmail("known");
        await _factory.CreateUserAsync(known, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();

        var forKnown = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new { email = known }
        );
        var forUnknown = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new { email = UniqueEmail("nobody") }
        );

        Assert.Equal(forKnown.StatusCode, forUnknown.StatusCode);
        Assert.Equal(
            (await BodyAsync(forKnown)).GetProperty("message").GetString(),
            (await BodyAsync(forUnknown)).GetProperty("message").GetString()
        );
    }

    [Fact]
    public async Task ResettingToAWeakPasswordIsRefused()
    {
        var email = UniqueEmail("weak-reset");
        await _factory.CreateUserAsync(email, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();
        var token = await RequestResetTokenAsync(client, email);

        var response = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email,
                token,
                password = "weak",
                confirmPassword = "weak",
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Change -------------------------------------------------------------

    [Fact]
    public async Task ChangingYourOwnPasswordRequiresTheCurrentOne()
    {
        var email = UniqueEmail("change");
        await _factory.CreateUserAsync(email, Password, Roles.Employee);
        var client = await _factory.SignInAsync(email, Password);

        var wrong = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = "NotTheRightOne!1",
                newPassword = NewPassword,
                confirmPassword = NewPassword,
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);

        var right = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = Password,
                newPassword = NewPassword,
                confirmPassword = NewPassword,
            }
        );

        Assert.Equal(HttpStatusCode.OK, right.StatusCode);

        // Changing the password rotates the security stamp; the caller's own session is
        // refreshed rather than dropped.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task ChangingAPasswordRequiresBeingSignedIn()
    {
        var response = await _factory
            .CreateAnonymousClient()
            .PostAsJsonAsync(
                "/api/auth/change-password",
                new
                {
                    currentPassword = Password,
                    newPassword = NewPassword,
                    confirmPassword = NewPassword,
                }
            );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- Posting ownership --------------------------------------------------

    private static object JobBody(string? ownerId = null) =>
        new
        {
            ownerId,
            title = "Engineer",
            company = "Acme",
            description = "Work here.",
            jobType = "Full-time",
            tags = Array.Empty<string>(),
        };

    [Fact]
    public async Task AnAdministratorCanPublishOnAnEmployersBehalf()
    {
        var employerEmail = UniqueEmail("owner-target");
        var employerId = await _factory.CreateUserAsync(employerEmail, Password, Roles.Employer);

        var adminEmail = UniqueEmail("publisher");
        await _factory.CreateUserAsync(adminEmail, Password, Roles.Admin);
        var admin = await _factory.SignInAsync(adminEmail, Password);

        var created = await admin.PostAsJsonAsync("/api/jobs", JobBody(employerId));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var jobId = (await BodyAsync(created)).GetProperty("jobId").GetInt32();

        // It belongs to the employer, so it shows up on their dashboard rather than the
        // administrator's. This is what used to be wrong: every posting an administrator
        // created was owned by the administrator.
        var employer = await _factory.SignInAsync(employerEmail, Password);
        var mine = await BodyAsync(await employer.GetAsync("/api/jobs/mine"));

        Assert.Contains(mine.EnumerateArray(), job => job.GetProperty("id").GetInt32() == jobId);
    }

    [Fact]
    public async Task AnAdministratorCannotAssignAPostingToSomebodyWhoIsNotAnEmployer()
    {
        var seekerId = await _factory.CreateUserAsync(
            UniqueEmail("not-an-employer"),
            Password,
            Roles.Employee
        );

        var adminEmail = UniqueEmail("assigner");
        await _factory.CreateUserAsync(adminEmail, Password, Roles.Admin);
        var admin = await _factory.SignInAsync(adminEmail, Password);

        var response = await admin.PostAsJsonAsync("/api/jobs", JobBody(seekerId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// An employer naming somebody else as the owner must be ignored, not honoured —
    /// otherwise anyone could plant a posting on another company's dashboard.
    /// </summary>
    [Fact]
    public async Task AnEmployerCannotPublishUnderAnotherEmployersName()
    {
        var otherId = await _factory.CreateUserAsync(
            UniqueEmail("other-company"),
            Password,
            Roles.Employer
        );

        var mineEmail = UniqueEmail("mine-company");
        await _factory.CreateUserAsync(mineEmail, Password, Roles.Employer);
        var employer = await _factory.SignInAsync(mineEmail, Password);

        var created = await employer.PostAsJsonAsync("/api/jobs", JobBody(otherId));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var jobId = (await BodyAsync(created)).GetProperty("jobId").GetInt32();

        var ownerId = await _factory.WithDbAsync(context =>
            Task.FromResult(
                context.JobPostings.IgnoreQueryFilters().Single(j => j.Id == jobId).OwnerId
            )
        );

        Assert.NotEqual(otherId, ownerId);
    }
}
