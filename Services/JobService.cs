using findajob.Data;
using findajob.Models;
using Microsoft.EntityFrameworkCore;

namespace findajob.Services
{
    public class JobService
    {
        private readonly IDbContextFactory<ApplicationDbContext> _factory;

        public JobService(IDbContextFactory<ApplicationDbContext> factory) => _factory = factory;

        public async Task<List<JobPosting>> GetJobsAsync()
        {
            using var context = await _factory.CreateDbContextAsync();
            return await context.JobPostings.OrderByDescending(j => j.CreatedAt).ToListAsync();
        }

        public async Task CreateJobAsync(JobPosting job)
        {
            using var context = await _factory.CreateDbContextAsync();
            job.CreatedAt = DateTime.UtcNow;
            context.JobPostings.Add(job);
            await context.SaveChangesAsync();
        }

        // FIX: Now accepts currentUserId and matches the UI call
        public async Task DeleteJobAsync(int id, string? currentUserId, bool isAdmin = false)
        {
            using var context = await _factory.CreateDbContextAsync();
            // Monkey check: find job if I own it OR if I am an Admin
            var job = await context.JobPostings.FirstOrDefaultAsync(j =>
                j.Id == id && (j.OwnerId == currentUserId || isAdmin)
            );

            if (job != null)
            {
                context.JobPostings.Remove(job);
                await context.SaveChangesAsync();
            }
        }

        public async Task<List<JobPosting>> SearchJobsAsync(string searchTerm)
        {
            using var context = await _factory.CreateDbContextAsync();

            if (string.IsNullOrWhiteSpace(searchTerm))
                return await context.JobPostings.OrderByDescending(j => j.CreatedAt).ToListAsync();

            return await context
                .JobPostings.Where(j =>
                    j.Title.ToLower().Contains(searchTerm.ToLower())
                    || j.Company.ToLower().Contains(searchTerm.ToLower())
                )
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
        }

        public async Task<JobPosting?> GetJobByIdAsync(int id)
        {
            using var context = await _factory.CreateDbContextAsync();
            return await context.JobPostings.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);
        }

        // FIX: Standardized variable names to use _factory and context
        public async Task<bool> UpdateJobAsync(
            JobPosting job,
            string currentUserId,
            bool isAdmin = false
        )
        {
            using var context = await _factory.CreateDbContextAsync();

            // Logic: Find the job if I own it OR if I am an admin
            var existingJob = await context.JobPostings.FirstOrDefaultAsync(j =>
                j.Id == job.Id && (j.OwnerId == currentUserId || isAdmin)
            );

            if (existingJob == null)
                return false;

            context.Entry(existingJob).CurrentValues.SetValues(job);
            await context.SaveChangesAsync();
            return true;
        }

        // FIX: Renamed to match your UI's 'GetJobsByOwnerAsync' call
        public async Task<List<JobPosting>> GetJobsByOwnerAsync(string userId)
        {
            using var context = await _factory.CreateDbContextAsync();
            return await context
                .JobPostings.Where(j => j.OwnerId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<JobApplication>> GetApplicationsForEmployerAsync(string employerId)
        {
            using var context = await _factory.CreateDbContextAsync();

            var jobIds = await context
                .JobPostings.Where(j => j.OwnerId == employerId && !j.IsDeleted)
                .Select(j => j.Id)
                .ToListAsync();

            if (!jobIds.Any())
                return new List<JobApplication>(); // Return empty instead of querying 'WHERE 0'

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
    }
}
