using findajob.Data;
using findajob.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace backend.tests;

/// <summary>
/// A throwaway SQLite database held in memory, plus an <see cref="IDbContextFactory{T}"/>
/// over it so services can be exercised exactly as they are in the application.
///
/// The previous tests used the EF Core in-memory provider, which ignores foreign keys,
/// unique indexes and cascade rules. That is precisely the behaviour these tests need
/// to check, so it could not have caught the cascade-delete problem in the seeder.
/// SQLite is a real relational engine and enforces all of it.
/// </summary>
public sealed class SqliteTestDatabase : IDbContextFactory<ApplicationDbContext>, IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public SqliteTestDatabase()
    {
        // The database lives for as long as this connection stays open.
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .EnableSensitiveDataLogging()
            .Options;

        using var context = CreateDbContext();
        context.Database.EnsureCreated();
    }

    public ApplicationDbContext CreateDbContext() => new(_options);

    public Task<ApplicationDbContext> CreateDbContextAsync(
        CancellationToken cancellationToken = default
    ) => Task.FromResult(CreateDbContext());

    /// <summary>
    /// Inserts the minimum of a user account. Job postings, applications and saved
    /// jobs all have a foreign key to <c>AspNetUsers</c>, which SQLite enforces, so
    /// tests must create the people they reference.
    /// </summary>
    public async Task<ApplicationUser> AddUserAsync(string id, string? email = null)
    {
        await using var context = CreateDbContext();

        var user = new ApplicationUser
        {
            Id = id,
            UserName = email ?? $"{id}@example.com",
            NormalizedUserName = (email ?? $"{id}@example.com").ToUpperInvariant(),
            Email = email ?? $"{id}@example.com",
            NormalizedEmail = (email ?? $"{id}@example.com").ToUpperInvariant(),
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString(),
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return user;
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
