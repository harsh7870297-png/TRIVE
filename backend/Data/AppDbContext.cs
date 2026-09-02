using Microsoft.EntityFrameworkCore;
using TriveApi.Models;

namespace TriveApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<UserInterview> UserInterviews { get; set; } = null!;
        public DbSet<Survey> Surveys { get; set; } = null!;
        public DbSet<AnalyticsEvent> AnalyticsEvents { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Server-side database unique constraint on Username
            modelBuilder.Entity<UserInterview>()
                .HasIndex(u => u.Username)
                .IsUnique();
        }
    }
}
