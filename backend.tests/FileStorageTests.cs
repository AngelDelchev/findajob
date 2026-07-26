using System.Text;
using findajob.Services;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace backend.tests;

/// <summary>
/// Uploads are stored outside <c>wwwroot</c> so nothing is served without an
/// authorisation check. These tests cover the boundary of that store: names must
/// never be able to escape it.
/// </summary>
public class FileStorageTests : IDisposable
{
    private readonly string _root;
    private readonly FileStorage _storage;

    public FileStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"findajob-tests-{Guid.NewGuid():N}");

        var environment = new TestHostEnvironment(_root);
        var options = Options.Create(new FileStorageOptions { RootPath = "uploads" });

        _storage = new FileStorage(options, environment, NullLogger<FileStorage>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    private static Stream Content(string text) => new MemoryStream(Encoding.UTF8.GetBytes(text));

    [Fact]
    public async Task SaveAsync_GeneratesANewNameAndKeepsTheExtension()
    {
        var name = await _storage.SaveAsync(
            FileStorageFolders.Cvs,
            "My Very Personal CV.pdf",
            Content("hello")
        );

        // The original name is never used on disk, so a hostile one cannot matter.
        Assert.EndsWith(".pdf", name);
        Assert.DoesNotContain("Personal", name);
        Assert.True(_storage.Exists(FileStorageFolders.Cvs, name));
    }

    [Fact]
    public async Task SaveAsync_NeverReusesAName()
    {
        var first = await _storage.SaveAsync(FileStorageFolders.Cvs, "cv.pdf", Content("one"));
        var second = await _storage.SaveAsync(FileStorageFolders.Cvs, "cv.pdf", Content("two"));

        Assert.NotEqual(first, second);
    }

    [Fact]
    public async Task OpenRead_ReturnsWhatWasWritten()
    {
        var name = await _storage.SaveAsync(FileStorageFolders.Cvs, "cv.pdf", Content("payload"));

        await using var stream = _storage.OpenRead(FileStorageFolders.Cvs, name);
        Assert.NotNull(stream);

        using var reader = new StreamReader(stream);
        Assert.Equal("payload", await reader.ReadToEndAsync());
    }

    [Fact]
    public void OpenRead_ReturnsNullForAMissingFile()
    {
        Assert.Null(_storage.OpenRead(FileStorageFolders.Cvs, "does-not-exist.pdf"));
    }

    [Theory]
    [InlineData("../appsettings.json")]
    [InlineData("../../etc/passwd")]
    [InlineData("subdir/file.pdf")]
    [InlineData("..")]
    [InlineData("")]
    public void PathTraversalAttemptsAreRefused(string fileName)
    {
        Assert.Null(_storage.OpenRead(FileStorageFolders.Cvs, fileName));
        Assert.False(_storage.Exists(FileStorageFolders.Cvs, fileName));
    }

    [Fact]
    public async Task Delete_RemovesTheFile()
    {
        var name = await _storage.SaveAsync(FileStorageFolders.Avatars, "me.png", Content("img"));
        Assert.True(_storage.Exists(FileStorageFolders.Avatars, name));

        _storage.Delete(FileStorageFolders.Avatars, name);

        Assert.False(_storage.Exists(FileStorageFolders.Avatars, name));
    }

    [Fact]
    public void Delete_IsSafeToCallForAFileThatIsNotThere()
    {
        var exception = Record.Exception(
            () => _storage.Delete(FileStorageFolders.Avatars, "missing.png")
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task ImportIfMissingAsync_DoesNotOverwriteAnExistingFile()
    {
        var source = Path.Combine(_root, "bundled.svg");
        Directory.CreateDirectory(_root);
        await File.WriteAllTextAsync(source, "bundled");

        await _storage.ImportIfMissingAsync(FileStorageFolders.Avatars, "logo.svg", source);
        await File.WriteAllTextAsync(source, "changed");
        await _storage.ImportIfMissingAsync(FileStorageFolders.Avatars, "logo.svg", source);

        await using var stream = _storage.OpenRead(FileStorageFolders.Avatars, "logo.svg")!;
        using var reader = new StreamReader(stream);

        Assert.Equal("bundled", await reader.ReadToEndAsync());
    }

    private sealed class TestHostEnvironment(string contentRoot) : IHostEnvironment
    {
        public string ApplicationName { get; set; } = "tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = contentRoot;
        public string EnvironmentName { get; set; } = "Development";
    }
}
