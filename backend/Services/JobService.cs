using findajob.Data;
using findajob.Models;
using Microsoft.EntityFrameworkCore;

namespace findajob.Services;

/// <summary>A page of results plus the totals the UI needs to render a pager.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);
}

public class JobService
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private readonly IDbContextFactory<ApplicationDbContext> _factory;

    public JobService(IDbContextFactory<ApplicationDbContext> factory)
    {
        _factory = factory;
    }

    /// <summary>
    /// Searches active postings.
    ///
    /// Results are paged. The previous version returned every matching posting with its
    /// full description, requirements and responsibilities on each keystroke, which for
    /// the seeded dataset meant a few hundred rows per search.
    /// </summary>
    public async Task<PagedResult<JobPosting>> SearchJobsAsync(
        string? searchTerm,
        int page = 1,
        int pageSize = DefaultPageSize,
        CancellationToken cancellationToken = default
    )
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        var query = context
            .JobPostings.AsNoTracking()
            .Include(j => j.JobPostingTags)
            .ThenInclude(jt => jt.Tag)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(j =>
                j.Title.ToLower().Contains(term)
                || j.Company.ToLower().Contains(term)
                || j.Description.ToLower().Contains(term)
                || j.Location.ToLower().Contains(term)
                || j.JobPostingTags.Any(jt => jt.Tag != null && jt.Tag.Name.ToLower().Contains(term))
            );
        }

        var total = await query.CountAsync(cancellationToken);

        var jobs = await query
            .OrderByDescending(j => j.CreatedAt)
            .ThenByDescending(j => j.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        jobs.ForEach(PopulateTags);
        return new PagedResult<JobPosting>(jobs, page, pageSize, total);
    }

    public async Task<JobPosting?> GetJobByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        var job = await context
            .JobPostings.AsNoTracking()
            .Include(j => j.JobPostingTags)
            .ThenInclude(jt => jt.Tag)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken);

        if (job is not null)
        {
            PopulateTags(job);
        }

        return job;
    }

    public async Task<List<JobPosting>> GetJobsByOwnerAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        // Archived postings are included so the owner can restore them.
        var jobs = await context
            .JobPostings.AsNoTracking()
            .IgnoreQueryFilters()
            .Include(j => j.JobPostingTags)
            .ThenInclude(jt => jt.Tag)
            .Where(j => j.OwnerId == userId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(cancellationToken);

        jobs.ForEach(PopulateTags);
        return jobs;
    }

    public async Task<JobPosting> CreateJobAsync(
        JobPosting job,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var tagNames = job.Tags;

        job.Id = 0;
        job.CreatedAt = DateTime.UtcNow;
        job.PostedDate = DateTime.UtcNow;
        job.JobPostingTags = [];

        context.JobPostings.Add(job);
        await context.SaveChangesAsync(cancellationToken);

        await SyncTagsAsync(context, job, tagNames, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return job;
    }

    public async Task<bool> UpdateJobAsync(
        JobPosting job,
        string currentUserId,
        bool isAdmin = false,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var existing = await context
            .JobPostings.IgnoreQueryFilters()
            .Include(j => j.JobPostingTags)
            .FirstOrDefaultAsync(j => j.Id == job.Id, cancellationToken);

        if (existing is null || (!isAdmin && existing.OwnerId != currentUserId))
        {
            return false;
        }

        existing.Title = job.Title;
        existing.Company = job.Company;
        existing.CompanyDescription = job.CompanyDescription;
        existing.Description = job.Description;
        existing.Location = job.Location;
        existing.Salary = job.Salary;
        existing.JobType = job.JobType;
        existing.WorkMode = job.WorkMode;
        existing.EmploymentType = job.EmploymentType;
        existing.SeniorityLevel = job.SeniorityLevel;
        existing.Requirements = job.Requirements;
        existing.Responsibilities = job.Responsibilities;
        existing.Benefits = job.Benefits;
        existing.Deadline = job.Deadline;

        await SyncTagsAsync(context, existing, job.Tags, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return true;
    }

    public async Task<bool> SetJobVisibilityAsync(
        int id,
        string userId,
        bool isAdmin,
        bool isDeleted,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        var job = await context
            .JobPostings.IgnoreQueryFilters()
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken);

        if (job is null || (!isAdmin && job.OwnerId != userId))
        {
            return false;
        }

        job.IsDeleted = isDeleted;
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<bool> DeleteJobAsync(
        int id,
        string userId,
        bool isAdmin,
        CancellationToken cancellationToken = default
    ) => SetJobVisibilityAsync(id, userId, isAdmin, isDeleted: true, cancellationToken);

    public async Task<List<JobApplication>> GetApplicationsForUserAsync(
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        return await context
            .JobApplications.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<JobApplication>> GetApplicationsForEmployerAsync(
        string employerId,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);

        // A single join rather than loading the employer's job ids first.
        return await (
            from application in context.JobApplications.AsNoTracking()
            join job in context.JobPostings.IgnoreQueryFilters()
                on application.JobId equals job.Id
            where job.OwnerId == employerId
            orderby application.AppliedAt descending
            select application
        ).ToListAsync(cancellationToken);
    }

    public async Task SubmitApplicationAsync(
        JobApplication application,
        CancellationToken cancellationToken = default
    )
    {
        await using var context = await _factory.CreateDbContextAsync(cancellationToken);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Replaces a posting's tags, reusing existing <see cref="Tag"/> rows.
    ///
    /// The caller owns the transaction, so a failure part-way cannot leave a posting
    /// with its old links removed and no new ones written.
    /// </summary>
    private static async Task SyncTagsAsync(
        ApplicationDbContext context,
        JobPosting job,
        List<string>? tagNames,
        CancellationToken cancellationToken
    )
    {
        var names = (tagNames ?? [])
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .DistinctBy(n => n.ToLowerInvariant())
            .ToList();

        var existingLinks = await context
            .JobPostingTags.Where(jt => jt.JobPostingId == job.Id)
            .ToListAsync(cancellationToken);

        context.JobPostingTags.RemoveRange(existingLinks);

        if (names.Count == 0)
        {
            return;
        }

        var lowered = names.Select(n => n.ToLower()).ToList();

        // One query for all existing tags instead of one per tag name.
        var known = await context
            .Tags.Where(t => lowered.Contains(t.Name.ToLower()))
            .ToListAsync(cancellationToken);

        foreach (var name in names)
        {
            var tag = known.FirstOrDefault(t =>
                string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase)
            );

            if (tag is null)
            {
                tag = new Tag { Name = name };
                context.Tags.Add(tag);
                known.Add(tag);
            }

            context.JobPostingTags.Add(new JobPostingTag { JobPostingId = job.Id, Tag = tag });
        }
    }

    private static void PopulateTags(JobPosting job) =>
        job.Tags = job
            .JobPostingTags.Select(jt => jt.Tag?.Name ?? "")
            .Where(name => name.Length > 0)
            .ToList();
}
