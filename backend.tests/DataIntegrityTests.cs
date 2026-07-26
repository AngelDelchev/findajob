using findajob.Models;
using findajob.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.tests;

/// <summary>
/// Guards the database rules that the application relies on. These are written
/// against real SQLite, so foreign keys, cascades and unique indexes behave the way
/// they will in production.
/// </summary>
public class DataIntegrityTests : IAsyncLifetime, IDisposable
{
    private readonly SqliteTestDatabase _database = new();

    public async Task InitializeAsync()
    {
        await _database.AddUserAsync("employer-1");
        await _database.AddUserAsync("seeker-1");
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    public void Dispose() => _database.Dispose();

    /// <summary>
    /// The reason the seeder must never delete and regenerate postings: removing a
    /// posting takes every application to it along with it. The old seeder cleared
    /// all demo-employer jobs on every start, which silently destroyed applications.
    /// </summary>
    [Fact]
    public async Task DeletingAJobPosting_AlsoDeletesItsApplications()
    {
        int jobId;

        await using (var context = _database.CreateDbContext())
        {
            var job = new JobPosting { Title = "Engineer", OwnerId = "employer-1" };
            context.JobPostings.Add(job);
            await context.SaveChangesAsync();
            jobId = job.Id;

            context.JobApplications.Add(
                new JobApplication { JobId = jobId, UserId = "seeker-1", ApplicantName = "Ada" }
            );
            await context.SaveChangesAsync();
        }

        await using (var context = _database.CreateDbContext())
        {
            Assert.Equal(1, await context.JobApplications.CountAsync());

            var job = await context.JobPostings.SingleAsync(j => j.Id == jobId);
            context.JobPostings.Remove(job);
            await context.SaveChangesAsync();

            Assert.Equal(0, await context.JobApplications.CountAsync());
        }
    }

    /// <summary>Archiving is the safe operation: the applications survive.</summary>
    [Fact]
    public async Task ArchivingAJobPosting_KeepsItsApplications()
    {
        var service = new JobService(_database);
        var job = await service.CreateJobAsync(
            new JobPosting { Title = "Engineer", OwnerId = "employer-1" }
        );

        await service.SubmitApplicationAsync(
            new JobApplication { JobId = job.Id, UserId = "seeker-1", ApplicantName = "Ada" }
        );

        await service.SetJobVisibilityAsync(job.Id, "employer-1", isAdmin: false, isDeleted: true);

        await using var context = _database.CreateDbContext();
        Assert.Equal(1, await context.JobApplications.CountAsync());
    }

    [Fact]
    public async Task TheSameUserCannotApplyToTheSamePostingTwice()
    {
        await using var context = _database.CreateDbContext();

        var job = new JobPosting { Title = "Engineer", OwnerId = "employer-1" };
        context.JobPostings.Add(job);
        await context.SaveChangesAsync();

        context.JobApplications.Add(new JobApplication { JobId = job.Id, UserId = "seeker-1" });
        await context.SaveChangesAsync();

        context.JobApplications.Add(new JobApplication { JobId = job.Id, UserId = "seeker-1" });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task ASavedJobCannotBeRecordedTwiceForTheSameUser()
    {
        await using var context = _database.CreateDbContext();

        var job = new JobPosting { Title = "Engineer", OwnerId = "employer-1" };
        context.JobPostings.Add(job);
        await context.SaveChangesAsync();

        context.SavedJobs.Add(new SavedJob { UserId = "seeker-1", JobPostingId = job.Id });
        await context.SaveChangesAsync();

        context.SavedJobs.Add(new SavedJob { UserId = "seeker-1", JobPostingId = job.Id });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task TagNamesAreUnique()
    {
        await using var context = _database.CreateDbContext();

        context.Tags.Add(new Tag { Name = "C#" });
        await context.SaveChangesAsync();

        context.Tags.Add(new Tag { Name = "C#" });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task ARegistrationTokenCannotBeReused()
    {
        await using var context = _database.CreateDbContext();

        context.PendingRegistrations.Add(
            new PendingRegistration { Email = "a@example.com", Token = "shared-token" }
        );
        await context.SaveChangesAsync();

        context.PendingRegistrations.Add(
            new PendingRegistration { Email = "b@example.com", Token = "shared-token" }
        );

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }
}
