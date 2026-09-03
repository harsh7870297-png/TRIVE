using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TriveApi.Data;
using TriveApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers();
builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddHttpClient<GoogleSheetsWebhookService>();
builder.Services.AddSingleton<ExcelExportService>();

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure Database: Support both PostgreSQL and SQLite
var usePostgres = builder.Configuration.GetValue<bool>("UsePostgres");
var pgConnStr = builder.Configuration.GetConnectionString("PostgreSQL");

if (usePostgres && !string.IsNullOrEmpty(pgConnStr))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(pgConnStr));
}
else
{
    // High-performance SQLite database
    var baseDir = AppDomain.CurrentDomain.BaseDirectory;
    var dbPath = System.IO.Path.Combine(baseDir, "trive.db");
    var sqliteConnStr = builder.Configuration.GetConnectionString("SQLite") ?? $"Data Source={dbPath}";
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(sqliteConnStr));
}

var app = builder.Build();

// Ensure Database schema and Excel files are created on startup safely
try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();

        // Instantiate ExcelExportService to create traffic.xlsx and data.xlsx immediately
        scope.ServiceProvider.GetRequiredService<ExcelExportService>();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"[Startup] Non-critical initialization error: {ex.Message}");
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
