using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using findajob.Models;

namespace backend.tests;

/// <summary>
/// End-to-end checks on who is allowed to do what.
///
/// These run the whole application, so they cover the parts no unit test reaches: the
/// <c>[Authorize]</c> attributes, the ownership checks inside the controllers, and the
/// rule that a CV is only readable by its owner, an administrator, or an employer the
/// applicant actually applied to.
/// </summary>
public class AuthorizationTests : IClassFixture<ApiFactory>
{
    private const string Password = "TestPassw0rd!";

    private readonly ApiFactory _factory;

    public AuthorizationTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static string UniqueEmail(string prefix) =>
        $"{prefix}-{Guid.NewGuid():N}@example.com";

    private static object NewJobBody(string title = "Engineer") =>
        new
        {
            title,
            company = "Acme",
            companyDescription = "",
            location = "Sofia, Bulgaria",
            salary = "$ 1000",
            jobType = "Full-time",
            workMode = "",
            employmentType = "",
            seniorityLevel = "",
            description = "Come and work here.",
            requirements = "",
            responsibilities = "",
            benefits = "",
            deadline = (string?)null,
            tags = new[] { "C#" },
        };

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    private async Task<(HttpClient Client, string Id)> SignedInAsync(string prefix, string role)
    {
        var email = UniqueEmail(prefix);
        var id = await _factory.CreateUserAsync(email, Password, role);
        return (await _factory.SignInAsync(email, Password), id);
    }

    private static async Task<int> CreateJobAsync(HttpClient employer, string title = "Engineer")
    {
        var response = await employer.PostAsJsonAsync("/api/jobs", NewJobBody(title));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await BodyAsync(response)).GetProperty("jobId").GetInt32();
    }

    private static async Task<int> UploadCvAsync(HttpClient client)
    {
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes("%PDF-1.4 pretend document"));
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", "cv.pdf");

        var response = await client.PostAsync("/api/cv/upload", form);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await BodyAsync(response)).GetProperty("id").GetInt32();
    }

    // --- Administration -----------------------------------------------------

    [Fact]
    public async Task AdminEndpoints_RejectAnonymousCallers()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(Roles.Employee)]
    [InlineData(Roles.Employer)]
    public async Task AdminEndpoints_RejectEveryoneWhoIsNotAnAdministrator(string role)
    {
        var (client, _) = await SignedInAsync("non-admin", role);

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_AllowAnAdministrator()
    {
        var (client, _) = await SignedInAsync("admin", Roles.Admin);

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>
    /// The pending-registration list used to serialise the whole entity, handing an
    /// administrator every pending user's password hash and — worse — the confirmation
    /// token, which is enough on its own to activate that account.
    /// </summary>
    [Fact]
    public async Task PendingRegistrations_ExposeNeitherTheTokenNorThePasswordHash()
    {
        var anonymous = _factory.CreateAnonymousClient();
        await anonymous.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = UniqueEmail("pending"),
                password = Password,
                confirmPassword = Password,
                firstName = "Pending",
                lastName = "Person",
                role = Roles.Employee,
            }
        );

        var (admin, _) = await SignedInAsync("admin-reg", Roles.Admin);
        var response = await admin.GetAsync("/api/admin/registrations");
        var payload = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("token", payload, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("passwordHash", payload, StringComparison.OrdinalIgnoreCase);
    }

    // --- Job postings -------------------------------------------------------

    [Fact]
    public async Task AJobSeekerCannotPublishAPosting()
    {
        var (client, _) = await SignedInAsync("seeker", Roles.Employee);

        var response = await client.PostAsJsonAsync("/api/jobs", NewJobBody());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnEmployerCannotEditSomebodyElsesPosting()
    {
        var (owner, _) = await SignedInAsync("owner", Roles.Employer);
        var (intruder, _) = await SignedInAsync("intruder", Roles.Employer);

        var jobId = await CreateJobAsync(owner, "Original title");

        var response = await intruder.PutAsJsonAsync(
            $"/api/jobs/{jobId}",
            NewJobBody("Hijacked")
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var reloaded = await BodyAsync(await owner.GetAsync($"/api/jobs/{jobId}"));
        Assert.Equal("Original title", reloaded.GetProperty("title").GetString());
    }

    [Fact]
    public async Task AnEmployerCannotArchiveSomebodyElsesPosting()
    {
        var (owner, _) = await SignedInAsync("owner-archive", Roles.Employer);
        var (intruder, _) = await SignedInAsync("intruder-archive", Roles.Employer);

        var jobId = await CreateJobAsync(owner);

        var response = await intruder.DeleteAsync($"/api/jobs/{jobId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// The vocabularies are published at <c>/api/jobs/metadata</c> and were previously
    /// not enforced, so a posting could be stored with a job type nothing recognises.
    /// </summary>
    [Fact]
    public async Task APostingWithAnUnknownJobTypeIsRejected()
    {
        var (employer, _) = await SignedInAsync("vocab", Roles.Employer);

        var response = await employer.PostAsJsonAsync(
            "/api/jobs",
            new
            {
                title = "Engineer",
                company = "Acme",
                description = "Work.",
                jobType = "Whenever I feel like it",
                tags = Array.Empty<string>(),
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Applications -------------------------------------------------------

    [Fact]
    public async Task TheSamePersonCannotApplyTwiceToOnePosting()
    {
        var (employer, _) = await SignedInAsync("emp-dup", Roles.Employer);
        var (seeker, _) = await SignedInAsync("seeker-dup", Roles.Employee);

        var jobId = await CreateJobAsync(employer);

        var body = new
        {
            jobId,
            applicantName = "Ada Lovelace",
            applicantEmail = "ada@example.com",
            message = "Hello.",
        };

        Assert.Equal(
            HttpStatusCode.OK,
            (await seeker.PostAsJsonAsync("/api/application", body)).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await seeker.PostAsJsonAsync("/api/application", body)).StatusCode
        );
    }

    [Fact]
    public async Task AJobSeekerCannotMoveAnApplicationThroughThePipeline()
    {
        var (employer, _) = await SignedInAsync("emp-status", Roles.Employer);
        var (seeker, _) = await SignedInAsync("seeker-status", Roles.Employee);

        var jobId = await CreateJobAsync(employer);
        var applicationId = await SubmitApplicationAsync(seeker, jobId);

        var response = await seeker.PutAsJsonAsync(
            $"/api/application/{applicationId}/status",
            new { status = ApplicationStatus.Accepted }
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnEmployerCannotTouchAnApplicationToAnotherEmployersPosting()
    {
        var (owner, _) = await SignedInAsync("emp-owner", Roles.Employer);
        var (intruder, _) = await SignedInAsync("emp-intruder", Roles.Employer);
        var (seeker, _) = await SignedInAsync("seeker-cross", Roles.Employee);

        var jobId = await CreateJobAsync(owner);
        var applicationId = await SubmitApplicationAsync(seeker, jobId);

        var response = await intruder.PutAsJsonAsync(
            $"/api/application/{applicationId}/status",
            new { status = ApplicationStatus.Rejected }
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<int> SubmitApplicationAsync(HttpClient seeker, int jobId)
    {
        var response = await seeker.PostAsJsonAsync(
            "/api/application",
            new
            {
                jobId,
                applicantName = "Ada Lovelace",
                applicantEmail = "ada@example.com",
                message = "Hello.",
            }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetInt32();
    }

    // --- CVs ----------------------------------------------------------------

    [Fact]
    public async Task ACvIsReadableByItsOwner()
    {
        var (seeker, _) = await SignedInAsync("cv-owner", Roles.Employee);
        var cvId = await UploadCvAsync(seeker);

        var response = await seeker.GetAsync($"/api/cv/{cvId}/content");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ACvIsNotReadableByAnAnonymousVisitor()
    {
        var (seeker, _) = await SignedInAsync("cv-anon", Roles.Employee);
        var cvId = await UploadCvAsync(seeker);

        var response = await _factory.CreateAnonymousClient().GetAsync($"/api/cv/{cvId}/content");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// The rule that matters most on this platform: an employer may read a CV only while
    /// its owner has actually applied to one of that employer's postings.
    /// </summary>
    [Fact]
    public async Task AnEmployerCannotReadTheCvOfSomebodyWhoNeverAppliedToThem()
    {
        var (seeker, _) = await SignedInAsync("cv-stranger", Roles.Employee);
        var (employer, _) = await SignedInAsync("cv-nosy-employer", Roles.Employer);

        var cvId = await UploadCvAsync(seeker);

        var response = await employer.GetAsync($"/api/cv/{cvId}/content");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnEmployerCanReadTheCvOfSomebodyWhoAppliedToThem()
    {
        var (seeker, _) = await SignedInAsync("cv-applicant", Roles.Employee);
        var (employer, _) = await SignedInAsync("cv-hiring-employer", Roles.Employer);

        var cvId = await UploadCvAsync(seeker);
        var jobId = await CreateJobAsync(employer);
        await SubmitApplicationAsync(seeker, jobId);

        var response = await employer.GetAsync($"/api/cv/{cvId}/content");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>
    /// CVs used to sit under <c>wwwroot</c>, where the static-file middleware served them
    /// to anyone holding the URL. They are stored outside the web root now, and the
    /// media route deliberately refuses to serve that folder.
    /// </summary>
    [Fact]
    public async Task TheMediaRouteServesAvatarsButRefusesTheCvFolder()
    {
        var (seeker, _) = await SignedInAsync("cv-path", Roles.Employee);
        var cvId = await UploadCvAsync(seeker);

        // Upload an avatar too, so the negative case below cannot pass simply because
        // the media route is broken for everything.
        using var form = new MultipartFormDataContent();
        var image = new ByteArrayContent([0x89, 0x50, 0x4E, 0x47]);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(image, "file", "avatar.png");

        var upload = await seeker.PostAsync("/api/profiles/avatar", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        var avatarUrl = (await BodyAsync(upload)).GetProperty("url").GetString()!;

        var storedCv = await _factory.WithDbAsync(context =>
            Task.FromResult(context.CvDocuments.Single(c => c.Id == cvId).StoredFileName)
        );

        var anonymous = _factory.CreateAnonymousClient();

        // The route works...
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync(avatarUrl)).StatusCode);

        // ...and still will not hand out a CV, by path or otherwise.
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await anonymous.GetAsync($"/uploads/cvs/{storedCv}")).StatusCode
        );
    }

    // --- Registration -------------------------------------------------------

    /// <summary>
    /// Registering with an address that already exists has to look exactly like
    /// registering with a fresh one, or the endpoint becomes a way to find out who holds
    /// an account here.
    /// </summary>
    [Fact]
    public async Task RegistrationDoesNotRevealWhetherAnAddressIsAlreadyTaken()
    {
        var taken = UniqueEmail("taken");
        await _factory.CreateUserAsync(taken, Password, Roles.Employee);

        var client = _factory.CreateAnonymousClient();

        static object Body(string email) =>
            new
            {
                email,
                password = Password,
                confirmPassword = Password,
                firstName = "A",
                lastName = "B",
                role = Roles.Employee,
            };

        var fresh = await client.PostAsJsonAsync("/api/auth/register", Body(UniqueEmail("fresh")));
        var existing = await client.PostAsJsonAsync("/api/auth/register", Body(taken));

        Assert.Equal(fresh.StatusCode, existing.StatusCode);
        Assert.Equal(
            (await BodyAsync(fresh)).GetProperty("message").GetString(),
            (await BodyAsync(existing)).GetProperty("message").GetString()
        );
    }

    [Fact]
    public async Task RegistrationRefusesAPasswordThatFailsThePolicy()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = UniqueEmail("weak"),
                password = "weak",
                confirmPassword = "weak",
                firstName = "A",
                lastName = "B",
                role = Roles.Employee,
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Only the two self-service roles may be asked for at sign-up.</summary>
    [Fact]
    public async Task RegistrationRefusesToHandOutTheAdministratorRole()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = UniqueEmail("escalate"),
                password = Password,
                confirmPassword = Password,
                firstName = "A",
                lastName = "B",
                role = Roles.Admin,
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
