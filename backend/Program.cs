using System.Threading.RateLimiting;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The connection string comes from configuration so production can point the
// database at a mounted volume. This used to be hard-coded to the content root,
// which meant the container's database was wiped on every deploy.
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? $"Data Source={Path.Combine(builder.Environment.ContentRootPath, "findajob.db")}";

builder.Services.Configure<AppOptions>(builder.Configuration.GetSection(AppOptions.SectionName));
builder.Services.Configure<FileStorageOptions>(builder.Configuration.GetSection("FileStorage"));

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddScoped<JobService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<IFileStorage, FileStorage>();

var emailSettings = builder.Configuration.GetSection("EmailSettings");
builder
    .Services.AddFluentEmail(emailSettings["FromEmail"] ?? "no-reply@findajob.local")
    .AddSmtpSender(() => new System.Net.Mail.SmtpClient
    {
        Host = emailSettings["Host"] ?? "localhost",
        Port = int.TryParse(emailSettings["Port"], out var port) ? port : 1025,
        EnableSsl = bool.TryParse(emailSettings["EnableSsl"], out var ssl) && ssl,
        UseDefaultCredentials = false,
        Credentials = new System.Net.NetworkCredential(
            emailSettings["Username"] ?? string.Empty,
            emailSettings["Password"] ?? string.Empty
        ),
    });

builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddDbContextFactory<ApplicationDbContext>(
    options => options.UseSqlite(connectionString),
    ServiceLifetime.Scoped
);

builder
    .Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = true;
        options.User.RequireUniqueEmail = true;

        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;

        // Repeated failures now actually lock the account. The sign-in calls used to
        // pass lockoutOnFailure: false, which disabled brute-force protection entirely.
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
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

builder.Services.AddAuthorization();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;

    // This is an API: answer with status codes rather than redirecting to a login page.
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// Throttles credential guessing and registration spam. The "auth" policy is applied
// to the sensitive endpoints; everything else falls under a generous global limit.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(
        "auth",
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
            )
    );

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 300,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
            )
    );
});

var corsOrigins =
    builder.Configuration.GetSection("App:CorsOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "ReactApp",
        policy =>
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
    );
});

// Behind the fly.io proxy the request arrives over plain HTTP; without this the app
// sees the wrong scheme and would never mark the auth cookie as secure.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

app.UseForwardedHeaders();

// Turns unhandled exceptions into RFC 7807 problem responses instead of leaking
// stack traces, and gives the SPA a predictable error shape to render.
app.UseExceptionHandler();
app.UseStatusCodePages();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();

app.UseRateLimiter();
app.UseCors("ReactApp");

app.UseAuthentication();
app.UseAuthorization();

await using (var scope = app.Services.CreateAsyncScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<ApplicationDbContext>();

    await db.Database.MigrateAsync();

    await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
    await db.Database.ExecuteSqlRawAsync("PRAGMA synchronous=NORMAL;");

    await DbInitializer.SeedAsync(services);
}

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Serves the React app for any route the API did not handle.
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Exposed so the test project can reference the entry-point assembly.</summary>
public partial class Program;
