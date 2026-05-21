using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "SewingStudio API", Version = "v1", Description = "CRM для ателье «Стиль»" });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Seed данные если база пустая
    if (!db.Roles.Any())
    {
        db.Roles.AddRange(
            new Role { Id = 1, RoleName = "Администратор" },
            new Role { Id = 2, RoleName = "Швея/Мастер" },
            new Role { Id = 3, RoleName = "Бухгалтер" },
            new Role { Id = 4, RoleName = "Клиент" }
        );
        db.SaveChanges();
    }

    if (!db.Statuses.Any())
    {
        db.Statuses.AddRange(
            new Status { StatusName = "Новый" },
            new Status { StatusName = "В работе" },
            new Status { StatusName = "Готов к выдаче" },
            new Status { StatusName = "Завершён" },
            new Status { StatusName = "Отменён" }
        );
        db.SaveChanges();
    }

    if (!db.Users.Any())
    {
        db.Clients.AddRange(
            new Client { FirstName = "Амина",    LastName = "Мендигалиева", Phone = "+79001112233", Email = "amina@mail.ru" },
            new Client { FirstName = "Пётр",     LastName = "Иванов",       Phone = "+79002223344", Email = "petya@mail.ru" },
            new Client { FirstName = "Светлана", LastName = "Козлова",      Phone = "+79003334455", Email = "sveta@mail.ru" }
        );
        db.SaveChanges();

        db.Users.AddRange(
            new User { RoleId = 1, Login = "admin",  Password = "admin123",  PhoneNumber = "+79000000001", ClientId = null },
            new User { RoleId = 2, Login = "master", Password = "master123", PhoneNumber = "+79000000002", ClientId = null },
            new User { RoleId = 3, Login = "buh",    Password = "buh123",    PhoneNumber = "+79000000003", ClientId = null },
            new User { RoleId = 4, Login = "petya",  Password = "petya123",  PhoneNumber = "+79002223344", ClientId = 2 }
        );
        db.SaveChanges();

        var master = db.Users.First(u => u.Login == "master");
        var amina  = db.Clients.First(c => c.FirstName == "Амина");
        var petya  = db.Clients.First(c => c.FirstName == "Пётр");
        var sveta  = db.Clients.First(c => c.FirstName == "Светлана");
        var inWork = db.Statuses.First(s => s.StatusName == "В работе");
        var ready  = db.Statuses.First(s => s.StatusName == "Готов к выдаче");
        var done   = db.Statuses.First(s => s.StatusName == "Завершён");
        var newSt  = db.Statuses.First(s => s.StatusName == "Новый");

        db.Orders.AddRange(
            new Order { Data = new DateTime(2026, 5, 20), IdClient = amina.Id,  IdUser = master.Id, Price = 1990m, Description = "Укоротить джинсы внизу и чуть расширить", StatusId = inWork.Id },
            new Order { Data = new DateTime(2026, 5, 18), IdClient = petya.Id,  IdUser = master.Id, Price = 3500m, Description = "Пошив летнего платья по меркам",          StatusId = ready.Id },
            new Order { Data = new DateTime(2026, 5, 15), IdClient = sveta.Id,  IdUser = master.Id, Price = 800m,  Description = "Замена молнии на куртке",                  StatusId = done.Id },
            new Order { Data = new DateTime(2026, 5, 21), IdClient = amina.Id,  IdUser = master.Id, Price = 1200m, Description = "Подшить брюки",                            StatusId = newSt.Id }
        );
        db.SaveChanges();

        var orders = db.Orders.ToList();
        db.Payments.AddRange(
            new Payment { OrderId = orders[0].Id, Amount = 1990m, PaymentDate = new DateTime(2026, 5, 20), PaymentMethod = "Наличные", Status = "Оплачено" },
            new Payment { OrderId = orders[1].Id, Amount = 3500m, PaymentDate = new DateTime(2026, 5, 18), PaymentMethod = "Карта",    Status = "Оплачено" },
            new Payment { OrderId = orders[2].Id, Amount = 800m,  PaymentDate = new DateTime(2026, 5, 15), PaymentMethod = "Карта",    Status = "Оплачено" }
        );
        db.Reviews.AddRange(
            new Review { OrderId = orders[2].Id, Rating = 5, Comment = "Всё сделали быстро и аккуратно, очень довольна!" },
            new Review { OrderId = orders[1].Id, Rating = 4, Comment = "Платье получилось красивое, спасибо мастеру." }
        );
        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "SewingStudio API v1"));

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Redirect root to index.html (SPA fallback)
app.MapFallbackToFile("index.html");

app.Run();