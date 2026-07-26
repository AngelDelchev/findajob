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
        public DbSet<PendingRegistration> PendingRegistrations => Set<PendingRegistration>();
        public DbSet<Experience> Experiences => Set<Experience>();
        public DbSet<Education> Educations => Set<Education>();
        public DbSet<Skill> Skills => Set<Skill>();
        public DbSet<BlockedUser> BlockedUsers => Set<BlockedUser>();
        public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
        public DbSet<Friendship> Friendships => Set<Friendship>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<JobPosting>().HasQueryFilter(j => !j.IsDeleted);
            builder.Entity<JobPosting>().HasIndex(j => j.Title);
            builder.Entity<JobPosting>().HasIndex(j => j.OwnerId);
            builder.Entity<JobPosting>().HasIndex(j => j.CreatedAt);

            builder.Entity<UserProfile>().HasIndex(p => p.UserId).IsUnique();

            builder.Entity<CvDocument>().HasIndex(c => c.UserId);

            builder.Entity<Notification>().HasIndex(n => new { n.UserId, n.IsRead });

            builder.Entity<SavedJob>().HasIndex(s => new { s.UserId, s.JobPostingId }).IsUnique();

            builder.Entity<Tag>().HasIndex(t => t.Name).IsUnique();

            builder
                .Entity<JobPostingTag>()
                .HasIndex(jt => new { jt.JobPostingId, jt.TagId })
                .IsUnique();

            builder.Entity<PendingRegistration>().HasIndex(p => p.Email).IsUnique();
            builder.Entity<PendingRegistration>().HasIndex(p => p.Token).IsUnique();

            builder.Entity<BlockedUser>().HasIndex(b => new { b.BlockerId, b.BlockedId }).IsUnique();

            builder.Entity<FriendRequest>().HasIndex(f => new { f.SenderId, f.ReceiverId, f.Status });
            builder.Entity<Friendship>().HasIndex(f => new { f.UserId, f.FriendId }).IsUnique();

            builder.Entity<Experience>().HasIndex(e => e.UserId);
            builder.Entity<Education>().HasIndex(e => e.UserId);
            builder.Entity<Skill>().HasIndex(s => s.UserId);

            // Backs the inbox and thread queries, which filter on both participants
            // and order by time.
            builder.Entity<Message>().HasIndex(m => new { m.SenderUserId, m.ReceiverUserId, m.SentAt });

            // Enforces "one application per person per posting" in the database rather
            // than relying on the controller check alone.
            builder.Entity<JobApplication>().HasIndex(a => new { a.UserId, a.JobId }).IsUnique();

            // Cascade deletes
            builder
                .Entity<JobPosting>()
                .HasMany(j => j.JobPostingTags)
                .WithOne(jt => jt.JobPosting)
                .HasForeignKey(jt => jt.JobPostingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<JobPosting>()
                .HasMany<JobApplication>()
                .WithOne(a => a.Job)
                .HasForeignKey(a => a.JobId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<JobPosting>()
                .WithOne()
                .HasForeignKey(j => j.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasOne<UserProfile>()
                .WithOne()
                .HasForeignKey<UserProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<CvDocument>()
                .WithOne()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<JobApplication>()
                .WithOne()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<SavedJob>()
                .WithOne()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<Notification>()
                .WithOne()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<Experience>()
                .WithOne()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<Education>()
                .WithOne()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<Skill>()
                .WithOne()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<Friendship>()
                .WithOne()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<ApplicationUser>()
                .HasMany<FriendRequest>()
                .WithOne()
                .HasForeignKey(f => f.SenderId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
