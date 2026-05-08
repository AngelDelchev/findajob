using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace backend.tests;

public class JobServiceTests
{
    private readonly Mock<IDbContextFactory<ApplicationDbContext>> _mockFactory;
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public JobServiceTests()
    {
        _mockFactory = new Mock<IDbContextFactory<ApplicationDbContext>>();
        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _mockFactory.Setup(f => f.CreateDbContextAsync(default))
            .ReturnsAsync(() => new ApplicationDbContext(_options));
    }

    [Fact]
    public async Task CreateJobAsync_ShouldAddJobToDatabase()
    {
        // Arrange
        var service = new JobService(_mockFactory.Object);
        var job = new JobPosting
        {
            Title = "Software Engineer",
            Company = "Test Corp",
            OwnerId = "user1",
            Tags = new List<string> { "C#", ".NET" }
        };

        // Act
        await service.CreateJobAsync(job);

        // Assert
        using var context = new ApplicationDbContext(_options);
        var savedJob = await context.JobPostings.FirstOrDefaultAsync();
        Assert.NotNull(savedJob);
        Assert.Equal("Software Engineer", savedJob.Title);
        Assert.Equal("Test Corp", savedJob.Company);
    }

    [Fact]
    public async Task GetJobsAsync_ShouldReturnActiveJobs()
    {
        // Arrange
        using (var context = new ApplicationDbContext(_options))
        {
            context.JobPostings.Add(new JobPosting { Title = "Job 1", Company = "C1", OwnerId = "O1", IsDeleted = false });
            context.JobPostings.Add(new JobPosting { Title = "Job 2", Company = "C2", OwnerId = "O2", IsDeleted = true });
            await context.SaveChangesAsync();
        }
        var service = new JobService(_mockFactory.Object);

        // Act
        var jobs = await service.GetJobsAsync();

        // Assert
        Assert.Single(jobs);
        Assert.Equal("Job 1", jobs[0].Title);
    }

    [Fact]
    public async Task SubmitApplicationAsync_ShouldAddApplication()
    {
        // Arrange
        var service = new JobService(_mockFactory.Object);
        var app = new JobApplication
        {
            JobId = 1,
            UserId = "user1",
            ApplicantName = "John Doe",
            Status = "Pending"
        };

        // Act
        await service.SubmitApplicationAsync(app);

        // Assert
        using var context = new ApplicationDbContext(_options);
        var savedApp = await context.JobApplications.FirstOrDefaultAsync();
        Assert.NotNull(savedApp);
        Assert.Equal("John Doe", savedApp.ApplicantName);
    }
}
