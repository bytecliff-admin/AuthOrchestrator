using AuthOrchestrator.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthOrchestrator.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        // public DbSet<ApplicationUser> Users => Set<ApplicationUser>(); // if not using Identity

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(t => t.Id);
                entity.HasIndex(t => t.Token).IsUnique();
                entity.HasIndex(t => t.UserId);
                entity.Property(t => t.Token).HasMaxLength(200).IsRequired();
                entity.Property(t => t.UserId).IsRequired();
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
