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

// Password reset links are short-lived. The default lifespan is a full day, which is a
// long window for a link that hands over an account to whoever holds it.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(2);
});

// How soon a signed-in session notices that its security stamp was rotated, which is
// what disabling an account and changing someone's roles now do. The default is thirty
// minutes; five keeps a disabled account from lingering while still costing at most one
// extra user lookup per session per five minutes.
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
{
    options.ValidationInterval = TimeSpan.FromMinutes(5);
});

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
//
// Every per-IP bucket keys off the remote address, which behind a proxy comes from
// X-Forwarded-For. That header is caller-supplied, so a per-IP limit on its own can be
// sidestepped by rotating the value. Two things close that off: the forwarded-headers
// configuration below only reads one hop, so the value used is the one the platform
// proxy appended rather than anything the caller wrote; and the authentication
// endpoints carry a second, unpartitioned ceiling that no header can raise.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string ClientKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    static bool IsAuthEndpoint(HttpContext context) =>
        context.Request.Path.StartsWithSegments(
            "/api/auth",
            StringComparison.OrdinalIgnoreCase
        );

    options.AddPolicy(
        "auth",
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                ClientKey(context),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
            )
    );

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        // Ordinary per-caller throughput.
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                ClientKey(context),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 300,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
            )
        ),
        // One shared bucket for all sign-in and registration traffic. It is deliberately
        // not partitioned, so spreading an attack over forged client addresses does not
        // buy any extra attempts. Sized well above what real use needs.
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            IsAuthEndpoint(context)
                ? RateLimitPartition.GetFixedWindowLimiter(
                    "auth-total",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }
                )
                : RateLimitPartition.GetNoLimiter<string>("unlimited")
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
//
// The proxy's own address is not known ahead of time, so the usual allow-list cannot be
// used and the checks are cleared. ForwardLimit pins how much of X-Forwarded-For is
// honoured: exactly one hop, the entry the proxy itself appended. Anything a caller put
// in the header ahead of that is left alone, which is what stops the per-IP rate limits
// from being sidestepped with a forged address.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

app.UseForwardedHeaders();

// Response hardening.
//
// nosniff is the one that matters here: MediaController hands out user-uploaded bytes
// with a content type worked out from the file extension, so without it a browser is
// free to sniff a file's contents and treat an "image" as something executable. The
// other two cost nothing and close off referrer leakage and clickjacking.
//
// No Content-Security-Policy: MUI styles the whole interface with injected inline
// <style> elements, so any policy strict enough to be worth having would need
// 'unsafe-inline' and would not actually buy anything.
app.Use(
    async (context, next) =>
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["X-Frame-Options"] = "DENY";

        await next();
    }
);

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

// Switchable so the integration tests, which drive many sign-ins from one address in a
// few seconds, are not throttled into failing. On unless it is turned off deliberately,
// and nothing but the test host does that. Read from the built application rather than
// the builder, because that is the point at which a test host's configuration has been
// layered in.
if (app.Configuration.GetValue("RateLimiting:Enabled", true))
{
    app.UseRateLimiter();
}

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
