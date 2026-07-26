using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace findajob.Controllers;

/// <summary>
/// Serves profile images from the upload store.
///
/// Uploads no longer live under <c>wwwroot</c>, so they are not exposed by the
/// static-file middleware. Avatars and banners are public by nature and served
/// here; CVs are deliberately absent and only reachable through
/// <see cref="CvController"/>, which checks the caller's identity first.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("uploads")]
public class MediaController : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();

    private readonly IFileStorage _storage;

    public MediaController(IFileStorage storage)
    {
        _storage = storage;
    }

    [HttpGet("{folder}/{fileName}")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Any)]
    public IActionResult Get(string folder, string fileName)
    {
        if (!FileStorageFolders.PubliclyServable.Contains(folder))
        {
            return NotFound();
        }

        var stream = _storage.OpenRead(folder, fileName);
        if (stream is null)
        {
            return NotFound();
        }

        if (!ContentTypeProvider.TryGetContentType(fileName, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return File(stream, contentType);
    }
}
