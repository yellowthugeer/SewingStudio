using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Models;

namespace SewingStudio.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role> Roles { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Client> Clients { get; set; }
    public DbSet<Status> Statuses { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Review> Reviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Roles seed data
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, RoleName = "Администратор" },
            new Role { Id = 2, RoleName = "Швея/Мастер" },
            new Role { Id = 3, RoleName = "Бухгалтер" },
            new Role { Id = 4, RoleName = "Клиент" }
        );

        // Status seed data
        modelBuilder.Entity<Status>().HasData(
            new Status { Id = 1, StatusName = "Новый" },
            new Status { Id = 2, StatusName = "В работе" },
            new Status { Id = 3, StatusName = "Готов к выдаче" },
            new Status { Id = 4, StatusName = "Завершён" },
            new Status { Id = 5, StatusName = "Отменён" }
        );

        // Order -> Client (restrict delete)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Client)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.IdClient)
            .OnDelete(DeleteBehavior.Restrict);

        // Order -> User (restrict delete)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.IdUser)
            .OnDelete(DeleteBehavior.Restrict);

        // Order -> Status (restrict delete)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Status)
            .WithMany(s => s.Orders)
            .HasForeignKey(o => o.StatusId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
