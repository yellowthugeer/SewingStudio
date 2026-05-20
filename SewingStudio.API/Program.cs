using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;

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

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "SewingStudio API v1"));

app.UseCors();
app.UseStaticFiles();
app.UseDefaultFiles();

app.MapControllers();

// Redirect root to index.html (SPA fallback)
app.MapFallbackToFile("index.html");

app.Run();
