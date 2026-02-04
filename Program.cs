using findajob.Components;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MudBlazor.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add interactive components
builder.Services.AddRazorComponents().AddInteractiveServerComponents();

// 2. Cascading Auth State - Fixes the IAuthenticationSchemeProvider error [6]
builder.Services.AddCascadingAuthenticationState();
builder
    .Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
        options.DefaultChallengeScheme = IdentityConstants.ApplicationScheme; // This fixes your error!
    })
    .AddIdentityCookies();

// 3. Database
builder.Services.AddDbContextFactory<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// 4. Identity (Strict Registration Order!) [7, 5]
builder
    .Services.AddIdentityCore<ApplicationUser>(options =>
        options.SignIn.RequireConfirmedAccount = false
    )
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// 5..NET 10 High-Performance Validation Service [8, 9]
builder.Services.AddValidation();

// 6. MudBlazor
builder.Services.AddMudServices();

var app = builder.Build();

// SQLite Performance: Enable WAL mode to prevent "Database Locked" during concurrent reads/writes
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    db.Database.ExecuteSqlRaw("PRAGMA synchronous=NORMAL;");
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAntiforgery();
app.MapStaticAssets();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.MapPost(
    "/Account/Logout",
    async (SignInManager<ApplicationUser> signInManager) =>
    {
        await signInManager.SignOutAsync();
        return Results.Redirect("/");
    }
);
app.UseAuthentication();
app.UseAuthorization();
using (var scope = app.Services.CreateScope())
{
    await DbInitializer.SeedRolesAndAdminAsync(scope.ServiceProvider);
}

app.Run();
