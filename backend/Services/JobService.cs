using findajob.Data;
using findajob.Models;
using Microsoft.EntityFrameworkCore;

namespace findajob.Services
{
    public class JobService
    {
        private readonly IDbContextFactory<ApplicationDbContext> _factory;

        public JobService(IDbContextFactory<ApplicationDbContext> factory)
        {
            _factory = factory;
        }

        private async Task SyncTagsAsync(ApplicationDbContext context, JobPosting job, List<string> tagNames)
        {
            // Remove old links for this job
            var existingLinks = await context.JobPostingTags.Where(jt => jt.JobPostingId == job.Id).ToListAsync();
            context.JobPostingTags.RemoveRange(existingLinks);
            await context.SaveChangesAsync();

            if (tagNames == null || !tagNames.Any()) return;

            foreach (var name in tagNames.Select(n => n.Trim()).Where(n => !string.IsNullOrEmpty(n)).Distinct())
            {
                var tag = await context.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == name.ToLower());
                if (tag == null)
                {
                    tag = new Tag { Name = name };
                    context.Tags.Add(tag);
                    await context.SaveChangesAsync();
                }

                context.JobPostingTags.Add(new JobPostingTag
                {
                    JobPostingId = job.Id,
                    TagId = tag.Id
                });
            }
            await context.SaveChangesAsync();
        }

        private void PopulateTags(JobPosting job)
        {
            if (job.JobPostingTags != null)
            {
                job.Tags = job.JobPostingTags
                    .Select(jt => jt.Tag?.Name ?? "")
                    .Where(n => !string.IsNullOrEmpty(n))
                    .ToList();
            }
            else
            {
                job.Tags = new List<string>();
            }
        }

        public async Task<List<JobPosting>> GetJobsAsync()
        {
            using var context = await _factory.CreateDbContextAsync();

            var jobs = await context
                .JobPostings
                .Include(j => j.JobPostingTags)
                .ThenInclude(jt => jt.Tag)
                .Where(j => !j.IsDeleted)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            jobs.ForEach(PopulateTags);
            return jobs;
        }

        public async Task CreateJobAsync(JobPosting job)
        {
            using var context = await _factory.CreateDbContextAsync();

            var tagNames = job.Tags ?? new List<string>();
            job.CreatedAt = DateTime.UtcNow;
            job.PostedDate = DateTime.UtcNow;

            context.JobPostings.Add(job);
            await context.SaveChangesAsync(); // Establish Job ID

            if (tagNames.Any())
            {
                await SyncTagsAsync(context, job, tagNames);
            }
        }

        public async Task<bool> DeleteJobAsync(int id, string userId, bool isAdmin)
        {
            using var context = await _factory.CreateDbContextAsync();

            var job = await context.JobPostings.FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return false;
            if (!isAdmin && job.OwnerId != userId) return false;

            job.IsDeleted = true;
            await context.SaveChangesAsync();
            return true;
        }

        public async Task<List<JobPosting>> SearchJobsAsync(string searchTerm)
        {
            using var context = await _factory.CreateDbContextAsync();

            IQueryable<JobPosting> query = context.JobPostings
                .Include(j => j.JobPostingTags)
                .ThenInclude(jt => jt.Tag)
                .Where(j => !j.IsDeleted);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.ToLower();
                query = query.Where(j =>
                    j.Title.ToLower().Contains(term)
                    || j.Company.ToLower().Contains(term)
                    || j.Description.ToLower().Contains(term)
                    || j.Location.ToLower().Contains(term)
                    || j.JobPostingTags.Any(jt => jt.Tag.Name.ToLower().Contains(term))
                );
            }

            var jobs = await query.OrderByDescending(j => j.CreatedAt).ToListAsync();
            jobs.ForEach(PopulateTags);
            return jobs;
        }

        public async Task<JobPosting?> GetJobByIdAsync(int id)
        {
            using var context = await _factory.CreateDbContextAsync();

            var job = await context
                .JobPostings
                .Include(j => j.JobPostingTags)
                .ThenInclude(jt => jt.Tag)
                .FirstOrDefaultAsync(j => j.Id == id && !j.IsDeleted);

            if (job != null) PopulateTags(job);
            return job;
        }

        public async Task<bool> UpdateJobAsync(JobPosting job, string currentUserId, bool isAdmin = false)
        {
            using var context = await _factory.CreateDbContextAsync();

            var existingJob = await context.JobPostings.FirstOrDefaultAsync(j =>
                j.Id == job.Id && (j.OwnerId == currentUserId || isAdmin)
            );

            if (existingJob == null) return false;

            existingJob.Title = job.Title;
            existingJob.Company = job.Company;
            existingJob.CompanyDescription = job.CompanyDescription;
            existingJob.Description = job.Description;
            existingJob.Location = job.Location;
            existingJob.Salary = job.Salary;
            existingJob.JobType = job.JobType;
            existingJob.WorkMode = job.WorkMode;
            existingJob.EmploymentType = job.EmploymentType;
            existingJob.SeniorityLevel = job.SeniorityLevel;
            existingJob.Requirements = job.Requirements;
            existingJob.Responsibilities = job.Responsibilities;
            existingJob.Benefits = job.Benefits;
            existingJob.Deadline = job.Deadline;

            await SyncTagsAsync(context, existingJob, job.Tags);
            await context.SaveChangesAsync();
            return true;
        }

        public async Task<List<JobPosting>> GetJobsByOwnerAsync(string userId)
        {
            using var context = await _factory.CreateDbContextAsync();

            var jobs = await context
                .JobPostings
                .Include(j => j.JobPostingTags)
                .ThenInclude(jt => jt.Tag)
                .Where(j => j.OwnerId == userId && !j.IsDeleted)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            jobs.ForEach(PopulateTags);
            return jobs;
        }

        public async Task<List<JobApplication>> GetApplicationsForEmployerAsync(string employerId)
        {
            using var context = await _factory.CreateDbContextAsync();

            var jobIds = await context
                .JobPostings.Where(j => j.OwnerId == employerId && !j.IsDeleted)
                .Select(j => j.Id)
                .ToListAsync();

            if (!jobIds.Any()) return new List<JobApplication>();

            return await context
                .JobApplications.Where(a => jobIds.Contains(a.JobId))
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
        }

        public async Task SubmitApplicationAsync(JobApplication application)
        {
            using var context = await _factory.CreateDbContextAsync();
            context.JobApplications.Add(application);
            await context.SaveChangesAsync();
        }

        public async Task<List<JobApplication>> GetApplicationsForUserAsync(string userId)
        {
            using var context = await _factory.CreateDbContextAsync();
            return await context
                .JobApplications.Where(a => a.UserId == userId)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
        }

        public async Task<bool> SetJobVisibilityAsync(int id, string userId, bool isAdmin, bool isDeleted)
        {
            using var context = await _factory.CreateDbContextAsync();

            var job = await context
                .JobPostings.IgnoreQueryFilters()
                .FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return false;
            if (!isAdmin && job.OwnerId != userId) return false;

            job.IsDeleted = isDeleted;
            await context.SaveChangesAsync();
            return true;
        }
    }
}
