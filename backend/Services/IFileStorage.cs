namespace findajob.Services;

/// <summary>Logical folders under the upload root.</summary>
public static class FileStorageFolders
{
    public const string Avatars = "avatars";
    public const string Banners = "banners";
    public const string Cvs = "cvs";

    public static readonly string[] PubliclyServable = [Avatars, Banners];
}

/// <summary>
/// Stores user uploads outside <c>wwwroot</c>.
///
/// This matters for more than tidiness: anything under <c>wwwroot</c> is handed out
/// by the static-file middleware with no authorisation at all, which previously made
/// every uploaded CV downloadable by anyone who had (or guessed) the URL. Keeping the
/// files out of the web root means the only way to read one is through a controller
/// that can check who is asking.
/// </summary>
public interface IFileStorage
{
    /// <summary>Persists <paramref name="content"/> and returns the generated file name.</summary>
    Task<string> SaveAsync(
        string folder,
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Copies a bundled asset into the store under an exact name, unless it is
    /// already there. Used to place the demo company logos into the upload volume
    /// on first run without ever overwriting a file a user has uploaded.
    /// </summary>
    Task ImportIfMissingAsync(
        string folder,
        string fileName,
        string sourcePath,
        CancellationToken cancellationToken = default
    );

    bool Exists(string folder, string fileName);

    /// <summary>Opens a stored file for reading, or <c>null</c> when it is missing.</summary>
    Stream? OpenRead(string folder, string fileName);

    void Delete(string folder, string fileName);
}
