using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Path.Combine(builder.Environment.ContentRootPath, "findajob.db");
var connectionString = $"Data Source={dbPath}";
Console.WriteLine($"[DB] {dbPath}");

builder.Services.AddControllers();
builder.Services.AddAuthorization();
builder.Services.AddScoped<JobService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var emailSettings = builder.Configuration.GetSection("EmailSettings");
builder
    .Services.AddFluentEmail(emailSettings["FromEmail"] ?? "noreply@findajob.com")
    .AddSmtpSender(new System.Net.Mail.SmtpClient
    {
        Host = emailSettings["Host"] ?? "localhost",
        Port = int.Parse(emailSettings["Port"] ?? "1025"),
        EnableSsl = bool.Parse(emailSettings["EnableSsl"] ?? "false"),
        UseDefaultCredentials = false,
        Credentials = new System.Net.NetworkCredential(
            emailSettings["Username"] ?? "",
            emailSettings["Password"] ?? ""
        )
    });

builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddDbContextFactory<ApplicationDbContext>(
    options => options.UseSqlite(connectionString),
    ServiceLifetime.Scoped
);

builder
    .Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder
    .Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
        options.DefaultChallengeScheme = IdentityConstants.ApplicationScheme;
    })
    .AddIdentityCookies();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.SameAsRequest;
});
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "ReactApp",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    );
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseCors("ReactApp");

app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    var db = services.GetRequiredService<ApplicationDbContext>();

    // Create tables (AspNetRoles/AspNetUsers/etc) if missing
    await db.Database.MigrateAsync();

    // SQLite perf PRAGMAs
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    db.Database.ExecuteSqlRaw("PRAGMA synchronous=NORMAL;");

    // Seed roles + base users
    await DbInitializer.SeedRolesAndUsers(services);
}
app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();
