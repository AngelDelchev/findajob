namespace findajob.Services;

/// <summary>
/// Files that ship with the application and are copied into the upload store on
/// first run. Several demo accounts can point at the same one, so they must never
/// be deleted when a user replaces their picture.
/// </summary>
public static class SeedAssets
{
    public const string DirectoryName = "SeedAssets";

    public static readonly string[] AvatarFileNames =
    [
        "google.svg",
        "microsoft.png",
        "sony.jpg",
        "samsung.svg",
        "apple.png",
        "arasaka.svg",
    ];

    public static bool IsSeedAvatar(string fileName) =>
        AvatarFileNames.Contains(fileName, StringComparer.OrdinalIgnoreCase);
}
