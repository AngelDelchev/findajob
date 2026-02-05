using findajob.Controllers;
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
            // This will work now because CreatedAt is in the model
            return await context.JobPostings.OrderByDescending(j => j.CreatedAt).ToListAsync();
        }

        public async Task CreateJobAsync(JobPosting job)
        {
            using var context = await _factory.CreateDbContextAsync();
            job.CreatedAt = DateTime.UtcNow;
            context.JobPostings.Add(job);
            await context.SaveChangesAsync();
        }

        public async Task DeleteJobAsync(int id)
        {
            using var context = await _factory.CreateDbContextAsync();
            var job = await context.JobPostings.FindAsync(id);
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
            {
                // If search is empty, return everything
                return await context.JobPostings.OrderByDescending(j => j.CreatedAt).ToListAsync();
            }

            // Filter by Title OR Company (Case Insensitive)
            return await context
                .JobPostings.Where(j =>
                    j.Title.ToLower().Contains(searchTerm.ToLower())
                    || j.Company.ToLower().Contains(searchTerm.ToLower())
                )
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
        }

        // Fetch a single job by ID (for Details and Edit)
        public async Task<JobPosting?> GetJobByIdAsync(int id)
        {
            using var context = await _factory.CreateDbContextAsync();
            return await context.JobPostings.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);
        }

        // Save changes to an existing job
        public async Task UpdateJobAsync(JobPosting job)
        {
            using var context = await _factory.CreateDbContextAsync();
            context.JobPostings.Update(job);
            await context.SaveChangesAsync();
        }
    }
}
