using Microsoft.Extensions.Options;

namespace findajob.Services;

public sealed class FileStorageOptions
{
    /// <summary>
    /// Absolute or content-root-relative path holding user uploads. Defaults to
    /// <c>App_Data/uploads</c>; in production this should point at a mounted volume
    /// so uploads survive a redeploy.
    /// </summary>
    public string RootPath { get; set; } = "App_Data/uploads";
}

public sealed class FileStorage : IFileStorage
{
    private readonly string _root;
    private readonly ILogger<FileStorage> _logger;

    public FileStorage(
        IOptions<FileStorageOptions> options,
        IHostEnvironment environment,
        ILogger<FileStorage> logger
    )
    {
        var configured = options.Value.RootPath;
        _root = Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(environment.ContentRootPath, configured);
        _logger = logger;

        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(
        string folder,
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default
    )
    {
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var directory = ResolveFolder(folder);

        Directory.CreateDirectory(directory);

        var path = Path.Combine(directory, fileName);
        await using var destination = new FileStream(path, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(destination, cancellationToken);

        return fileName;
    }

    public async Task ImportIfMissingAsync(
        string folder,
        string fileName,
        string sourcePath,
        CancellationToken cancellationToken = default
    )
    {
        if (!File.Exists(sourcePath) || !TryResolve(folder, fileName, out var destination))
        {
            return;
        }

        if (File.Exists(destination))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);

        await using var source = new FileStream(sourcePath, FileMode.Open, FileAccess.Read);
        await using var target = new FileStream(destination, FileMode.CreateNew, FileAccess.Write);
        await source.CopyToAsync(target, cancellationToken);

        _logger.LogInformation("Imported bundled asset {Folder}/{FileName}.", folder, fileName);
    }

    public bool Exists(string folder, string fileName) =>
        TryResolve(folder, fileName, out var path) && File.Exists(path);

    public Stream? OpenRead(string folder, string fileName)
    {
        if (!TryResolve(folder, fileName, out var path) || !File.Exists(path))
        {
            return null;
        }

        return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public void Delete(string folder, string fileName)
    {
        if (!TryResolve(folder, fileName, out var path) || !File.Exists(path))
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch (IOException ex)
        {
            // A file we cannot delete is not worth failing the user's request over.
            _logger.LogWarning(ex, "Could not delete stored file {Folder}/{FileName}.", folder, fileName);
        }
    }

    private string ResolveFolder(string folder)
    {
        if (string.IsNullOrWhiteSpace(folder) || folder.Contains('/') || folder.Contains('\\') || folder.Contains(".."))
        {
            throw new ArgumentException($"Invalid storage folder '{folder}'.", nameof(folder));
        }

        return Path.Combine(_root, folder);
    }

    /// <summary>
    /// Resolves a stored file, rejecting anything that tries to escape the upload
    /// root via path separators or <c>..</c> segments.
    /// </summary>
    private bool TryResolve(string folder, string fileName, out string path)
    {
        path = string.Empty;

        if (string.IsNullOrWhiteSpace(fileName))
        {
            return false;
        }

        // Reject any name that is not a plain file name.
        if (Path.GetFileName(fileName) != fileName)
        {
            return false;
        }

        var directory = ResolveFolder(folder);
        var candidate = Path.GetFullPath(Path.Combine(directory, fileName));

        if (!candidate.StartsWith(Path.GetFullPath(directory) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return false;
        }

        path = candidate;
        return true;
    }
}
