using findajob.Models;
using findajob.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.tests;

public class JobServiceTests : IAsyncLifetime, IDisposable
{
    private readonly SqliteTestDatabase _database = new();
    private readonly JobService _service;

    public JobServiceTests()
    {
        _service = new JobService(_database);
    }

    /// <summary>
    /// Postings and applications have foreign keys to <c>AspNetUsers</c>, which real
    /// SQLite enforces, so the people these tests refer to have to exist.
    /// </summary>
    public async Task InitializeAsync()
    {
        await _database.AddUserAsync("owner-1");
        await _database.AddUserAsync("employer-a");
        await _database.AddUserAsync("employer-b");
        await _database.AddUserAsync("seeker-1");
        await _database.AddUserAsync("seeker-2");
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    public void Dispose() => _database.Dispose();

    private static JobPosting NewJob(
        string title = "Software Engineer",
        string company = "Test Corp",
        string owner = "owner-1",
        params string[] tags
    ) =>
        new()
        {
            Title = title,
            Company = company,
            Description = "A description.",
            Location = "Sofia, Bulgaria",
            OwnerId = owner,
            Tags = [.. tags],
        };

    [Fact]
    public async Task CreateJobAsync_StoresTheJobAndItsTags()
    {
        var created = await _service.CreateJobAsync(NewJob(tags: ["C#", ".NET"]));

        var loaded = await _service.GetJobByIdAsync(created.Id);

        Assert.NotNull(loaded);
        Assert.Equal("Software Engineer", loaded.Title);
        Assert.Equal([".NET", "C#"], loaded.Tags.Order());
    }

    [Fact]
    public async Task CreateJobAsync_ReusesAnExistingTagRatherThanDuplicatingIt()
    {
        await _service.CreateJobAsync(NewJob(title: "First", tags: ["C#"]));
        await _service.CreateJobAsync(NewJob(title: "Second", tags: ["c#"]));

        await using var context = _database.CreateDbContext();

        // Tag names are unique, so a differently-cased duplicate must not be inserted.
        Assert.Equal(1, await context.Tags.CountAsync());
    }

    [Fact]
    public async Task SearchJobsAsync_ExcludesArchivedPostings()
    {
        var visible = await _service.CreateJobAsync(NewJob(title: "Visible"));
        var archived = await _service.CreateJobAsync(NewJob(title: "Archived"));

        await _service.SetJobVisibilityAsync(archived.Id, "owner-1", isAdmin: false, isDeleted: true);

        var result = await _service.SearchJobsAsync(null);

        Assert.Equal(1, result.Total);
        Assert.Equal(visible.Id, Assert.Single(result.Items).Id);
    }

    [Fact]
    public async Task SearchJobsAsync_MatchesOnTitleCompanyLocationAndTags()
    {
        await _service.CreateJobAsync(NewJob(title: "Backend Engineer", company: "Acme"));
        await _service.CreateJobAsync(NewJob(title: "Designer", company: "Globex", tags: ["Figma"]));

        Assert.Equal(1, (await _service.SearchJobsAsync("backend")).Total);
        Assert.Equal(1, (await _service.SearchJobsAsync("globex")).Total);
        Assert.Equal(1, (await _service.SearchJobsAsync("figma")).Total);
        Assert.Equal(2, (await _service.SearchJobsAsync("sofia")).Total);
        Assert.Equal(0, (await _service.SearchJobsAsync("nothing-matches")).Total);
    }

    /// <summary>
    /// The search builds a <c>LIKE</c> pattern, so <c>%</c> and <c>_</c> in what somebody
    /// typed have to be escaped. Unescaped, searching for a single "%" matched the whole
    /// table and "_" matched every posting with at least one character in the field.
    /// </summary>
    [Fact]
    public async Task SearchJobsAsync_TreatsWildcardCharactersAsOrdinaryText()
    {
        await _service.CreateJobAsync(NewJob(title: "Engineer"));
        await _service.CreateJobAsync(NewJob(title: "100% Remote Engineer"));

        var percent = await _service.SearchJobsAsync("%");
        Assert.Equal("100% Remote Engineer", Assert.Single(percent.Items).Title);

        // No posting contains an underscore, so this must find nothing rather than all.
        Assert.Equal(0, (await _service.SearchJobsAsync("_")).Total);
    }

    [Fact]
    public async Task SearchJobsAsync_ReturnsRequestedPageAndReportsTheTotal()
    {
        for (var i = 0; i < 25; i++)
        {
            await _service.CreateJobAsync(NewJob(title: $"Job {i}"));
        }

        var firstPage = await _service.SearchJobsAsync(null, page: 1, pageSize: 10);
        var lastPage = await _service.SearchJobsAsync(null, page: 3, pageSize: 10);

        Assert.Equal(25, firstPage.Total);
        Assert.Equal(3, firstPage.TotalPages);
        Assert.Equal(10, firstPage.Items.Count);
        Assert.Equal(5, lastPage.Items.Count);
    }

    [Fact]
    public async Task SearchJobsAsync_ClampsAnAbsurdPageSize()
    {
        await _service.CreateJobAsync(NewJob());

        var result = await _service.SearchJobsAsync(null, page: 0, pageSize: 100_000);

        Assert.Equal(1, result.Page);
        Assert.Equal(JobService.MaxPageSize, result.PageSize);
    }

    [Fact]
    public async Task UpdateJobAsync_ReplacesTheTagSet()
    {
        var job = await _service.CreateJobAsync(NewJob(tags: ["C#", "SQL"]));

        job.Tags = ["React"];
        var updated = await _service.UpdateJobAsync(job, "owner-1");

        Assert.True(updated);

        var loaded = await _service.GetJobByIdAsync(job.Id);
        Assert.Equal(["React"], loaded!.Tags);
    }

    /// <summary>
    /// Every writable field has to be carried onto the stored row. A field that
    /// <see cref="JobService.UpdateJobAsync"/> forgets to copy is silently dropped on
    /// every save, which is how the extended fields used to disappear.
    /// </summary>
    [Fact]
    public async Task UpdateJobAsync_CopiesEveryWritableFieldOntoTheStoredPosting()
    {
        var job = await _service.CreateJobAsync(NewJob());
        var deadline = new DateTime(2027, 3, 1, 0, 0, 0, DateTimeKind.Utc);

        job.Title = "Staff Engineer";
        job.Company = "Globex";
        job.CompanyDescription = "We make things.";
        job.Description = "A longer description.";
        job.Location = "Varna, Bulgaria";
        job.Salary = "$ 90000";
        job.JobType = "Contract";
        job.WorkMode = "Hybrid";
        job.EmploymentType = "Temporary";
        job.SeniorityLevel = "Lead";
        job.Requirements = "Five years of experience.";
        job.Responsibilities = "Ship things.";
        job.Benefits = "Health insurance.";
        job.Deadline = deadline;

        Assert.True(await _service.UpdateJobAsync(job, "owner-1"));

        var loaded = await _service.GetJobByIdAsync(job.Id);

        Assert.NotNull(loaded);
        Assert.Equal("Staff Engineer", loaded.Title);
        Assert.Equal("Globex", loaded.Company);
        Assert.Equal("We make things.", loaded.CompanyDescription);
        Assert.Equal("A longer description.", loaded.Description);
        Assert.Equal("Varna, Bulgaria", loaded.Location);
        Assert.Equal("$ 90000", loaded.Salary);
        Assert.Equal("Contract", loaded.JobType);
        Assert.Equal("Hybrid", loaded.WorkMode);
        Assert.Equal("Temporary", loaded.EmploymentType);
        Assert.Equal("Lead", loaded.SeniorityLevel);
        Assert.Equal("Five years of experience.", loaded.Requirements);
        Assert.Equal("Ship things.", loaded.Responsibilities);
        Assert.Equal("Health insurance.", loaded.Benefits);
        Assert.Equal(deadline, loaded.Deadline);
    }

    /// <summary>
    /// An update replaces the whole posting rather than patching it, so a caller that
    /// omits a field clears it. That is the contract every editor has to satisfy: the
    /// job form must round-trip all of these, and the admin list endpoint must return
    /// them, or opening a posting and saving it blanks whatever was left out.
    /// </summary>
    [Fact]
    public async Task UpdateJobAsync_ClearsFieldsThatTheCallerLeftUnset()
    {
        var job = await _service.CreateJobAsync(NewJob());

        job.Requirements = "Five years of experience.";
        job.Benefits = "Health insurance.";
        job.Deadline = new DateTime(2027, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        await _service.UpdateJobAsync(job, "owner-1");

        // A second update built the way an incomplete form would build it.
        var partial = new JobPosting
        {
            Id = job.Id,
            Title = job.Title,
            Description = job.Description,
            Tags = [],
        };

        Assert.True(await _service.UpdateJobAsync(partial, "owner-1"));

        var loaded = await _service.GetJobByIdAsync(job.Id);

        Assert.Equal(string.Empty, loaded!.Requirements);
        Assert.Equal(string.Empty, loaded.Benefits);
        Assert.Null(loaded.Deadline);
    }

    [Fact]
    public async Task UpdateJobAsync_RefusesWhenTheCallerIsNotTheOwner()
    {
        var job = await _service.CreateJobAsync(NewJob(tags: ["C#"]));

        job.Title = "Hijacked";
        var updated = await _service.UpdateJobAsync(job, "someone-else");

        Assert.False(updated);
        Assert.Equal("Software Engineer", (await _service.GetJobByIdAsync(job.Id))!.Title);
    }

    [Fact]
    public async Task UpdateJobAsync_AllowsAnAdministratorToEditAnyPosting()
    {
        var job = await _service.CreateJobAsync(NewJob());

        job.Title = "Edited by admin";
        var updated = await _service.UpdateJobAsync(job, "admin-id", isAdmin: true);

        Assert.True(updated);
        Assert.Equal("Edited by admin", (await _service.GetJobByIdAsync(job.Id))!.Title);
    }

    [Fact]
    public async Task DeleteJobAsync_ArchivesRatherThanRemoving()
    {
        var job = await _service.CreateJobAsync(NewJob());

        Assert.True(await _service.DeleteJobAsync(job.Id, "owner-1", isAdmin: false));

        await using var context = _database.CreateDbContext();
        var stored = await context.JobPostings.IgnoreQueryFilters().SingleAsync(j => j.Id == job.Id);

        Assert.True(stored.IsDeleted);
    }

    [Fact]
    public async Task GetJobsByOwnerAsync_IncludesArchivedPostingsSoTheyCanBeRestored()
    {
        var job = await _service.CreateJobAsync(NewJob());
        await _service.SetJobVisibilityAsync(job.Id, "owner-1", isAdmin: false, isDeleted: true);

        var mine = await _service.GetJobsByOwnerAsync("owner-1");

        Assert.True(Assert.Single(mine).IsDeleted);
    }

    [Fact]
    public async Task GetApplicationsForEmployerAsync_ReturnsOnlyApplicationsToThatEmployersJobs()
    {
        var mine = await _service.CreateJobAsync(NewJob(title: "Mine", owner: "employer-a"));
        var theirs = await _service.CreateJobAsync(NewJob(title: "Theirs", owner: "employer-b"));

        await _service.SubmitApplicationAsync(
            new JobApplication { JobId = mine.Id, UserId = "seeker-1", ApplicantName = "Ada" }
        );
        await _service.SubmitApplicationAsync(
            new JobApplication { JobId = theirs.Id, UserId = "seeker-2", ApplicantName = "Grace" }
        );

        var applications = await _service.GetApplicationsForEmployerAsync("employer-a");

        Assert.Equal("Ada", Assert.Single(applications).ApplicantName);
    }
}
