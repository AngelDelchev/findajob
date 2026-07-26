using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using findajob.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CvController : ControllerBase
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    private readonly ApplicationDbContext _context;
    private readonly IFileStorage _storage;

    public CvController(ApplicationDbContext context, IFileStorage storage)
    {
        _context = context;
        _storage = storage;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] bool isPrimary = false)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { message = "The file must be 10 MB or smaller." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedTypes.TryGetValue(extension, out var contentType))
        {
            return BadRequest(new { message = "Only PDF, DOC, and DOCX files are allowed." });
        }

        await using var stream = file.OpenReadStream();
        var storedFileName = await _storage.SaveAsync(FileStorageFolders.Cvs, file.FileName, stream);

        if (isPrimary)
        {
            var existingPrimary = await _context
                .CvDocuments.Where(c => c.UserId == userId && c.IsPrimary)
                .ToListAsync();

            foreach (var cv in existingPrimary)
            {
                cv.IsPrimary = false;
            }
        }

        var document = new CvDocument
        {
            UserId = userId,
            FileName = Path.GetFileName(file.FileName),
            StoredFileName = storedFileName,
            // Trust the extension we validated rather than the client-supplied header.
            ContentType = contentType,
            FileSize = file.Length,
            UploadedAt = DateTime.UtcNow,
            IsPrimary = isPrimary,
        };

        _context.CvDocuments.Add(document);
        await _context.SaveChangesAsync();

        return Ok(
            new
            {
                message = "CV uploaded successfully.",
                document.Id,
                document.FileName,
                document.FileSize,
                document.UploadedAt,
                document.IsPrimary,
            }
        );
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyCvs()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var cvs = await _context
            .CvDocuments.Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UploadedAt)
            .Select(c => new
            {
                c.Id,
                c.FileName,
                c.FileSize,
                c.IsPrimary,
                c.UploadedAt,
            })
            .ToListAsync();

        return Ok(cvs);
    }

    /// <summary>
    /// Streams the stored file.
    ///
    /// CVs used to live under <c>wwwroot</c> and were handed out by the static-file
    /// middleware, so anyone holding the URL could read any applicant's CV regardless
    /// of these checks. They are now stored outside the web root and this is the only
    /// way to reach one.
    /// </summary>
    [HttpGet("{id:int}/content")]
    public async Task<IActionResult> Download(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var cv = await _context.CvDocuments.FirstOrDefaultAsync(c => c.Id == id);
        if (cv is null)
        {
            return NotFound(new { message = "CV not found." });
        }

        if (!await CanAccessAsync(cv, userId))
        {
            return Forbid();
        }

        var stream = _storage.OpenRead(FileStorageFolders.Cvs, cv.StoredFileName);
        if (stream is null)
        {
            return NotFound(new { message = "The stored file is no longer available." });
        }

        return File(stream, cv.ContentType, cv.FileName);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var cv = await _context.CvDocuments.FirstOrDefaultAsync(c => c.Id == id);
        if (cv is null)
        {
            return NotFound(new { message = "CV not found." });
        }

        if (cv.UserId != userId && !User.IsInRole(Roles.Admin))
        {
            return Forbid();
        }

        _storage.Delete(FileStorageFolders.Cvs, cv.StoredFileName);
        _context.CvDocuments.Remove(cv);
        await _context.SaveChangesAsync();

        return Ok(new { message = "CV deleted successfully." });
    }

    /// <summary>
    /// The owner and administrators may always read a CV. An employer may read it only
    /// while the owner has an open application against one of that employer's postings.
    /// </summary>
    private async Task<bool> CanAccessAsync(CvDocument cv, string userId)
    {
        if (cv.UserId == userId || User.IsInRole(Roles.Admin))
        {
            return true;
        }

        if (!User.IsInRole(Roles.Employer))
        {
            return false;
        }

        return await _context.JobApplications.AnyAsync(a =>
            a.UserId == cv.UserId
            && _context.JobPostings.IgnoreQueryFilters()
                .Any(j => j.Id == a.JobId && j.OwnerId == userId)
        );
    }
}
