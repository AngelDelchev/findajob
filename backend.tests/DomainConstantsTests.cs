using findajob.Models;

namespace backend.tests;

/// <summary>
/// The application status vocabulary used to exist in three different versions: the
/// model default, the employer endpoint and the admin endpoint. A freshly submitted
/// application was "Pending", which the employer dropdown did not offer, so its status
/// rendered blank. These tests keep the single shared list honest.
/// </summary>
public class DomainConstantsTests
{
    [Fact]
    public void TheDefaultApplicationStatusIsPartOfTheAllowedSet()
    {
        var application = new JobApplication();

        Assert.Contains(application.Status, ApplicationStatus.All);
        Assert.Equal(ApplicationStatus.Pending, application.Status);
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Reviewed")]
    [InlineData("Interviewing")]
    [InlineData("Accepted")]
    [InlineData("Rejected")]
    public void EveryOfferedStatusIsAccepted(string status)
    {
        Assert.True(ApplicationStatus.IsValid(status));
    }

    [Theory]
    [InlineData("Applied")]
    [InlineData("")]
    [InlineData("pending")]
    [InlineData("Hired")]
    public void UnknownStatusesAreRejected(string status)
    {
        Assert.False(ApplicationStatus.IsValid(status));
    }

    [Fact]
    public void TheDefaultJobTypeIsOneOfTheOfferedTypes()
    {
        Assert.Contains(new JobPosting().JobType, JobConstants.JobTypes);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Employer")]
    [InlineData("Employee")]
    public void KnownRolesAreValid(string role) => Assert.True(Roles.IsValid(role));

    [Theory]
    [InlineData("Superuser")]
    [InlineData("admin")]
    [InlineData("")]
    public void UnknownRolesAreRejected(string role) => Assert.False(Roles.IsValid(role));
}
