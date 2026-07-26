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
