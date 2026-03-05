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
        public DbSet<JobApplication> JobApplications => Set<JobApplication>();

        public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
        public DbSet<CvDocument> CvDocuments => Set<CvDocument>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<SavedJob> SavedJobs => Set<SavedJob>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<JobPostingTag> JobPostingTags => Set<JobPostingTag>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<JobPosting>().HasQueryFilter(j => !j.IsDeleted);
            builder.Entity<JobPosting>().HasIndex(j => j.Title);

            builder.Entity<UserProfile>().HasIndex(p => p.UserId).IsUnique();

            builder.Entity<CvDocument>().HasIndex(c => c.UserId);

            builder.Entity<Notification>().HasIndex(n => n.UserId);

            builder.Entity<SavedJob>().HasIndex(s => new { s.UserId, s.JobPostingId }).IsUnique();

            builder.Entity<Tag>().HasIndex(t => t.Name).IsUnique();

            builder
                .Entity<JobPostingTag>()
                .HasIndex(jt => new { jt.JobPostingId, jt.TagId })
                .IsUnique();
        }
    }
}
