using findajob.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace findajob.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<JobPosting> JobPostings => Set<JobPosting>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Global filter: only fetch jobs that aren't soft-deleted [3]
            builder.Entity<JobPosting>().HasQueryFilter(j => !j.IsDeleted);

            // Optimize search index for job titles
            builder.Entity<JobPosting>().HasIndex(j => j.Title);
        }
    }
}
