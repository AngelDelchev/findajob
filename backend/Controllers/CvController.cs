using System.Security.Claims;
using findajob.Data;
using findajob.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace findajob.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CvController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public CvController(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] bool isPrimary = false
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only PDF, DOC, and DOCX files are allowed." });
        }

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "cvs");
        Directory.CreateDirectory(uploadsFolder);

        var storedFileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(uploadsFolder, storedFileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

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

        var cvDocument = new CvDocument
        {
            UserId = userId,
            FileName = file.FileName,
            StoredFileName = storedFileName,
            ContentType = file.ContentType,
            FileSize = file.Length,
            UploadedAt = DateTime.UtcNow,
            IsPrimary = isPrimary,
            ExtractedText = string.Empty,
        };

        _context.CvDocuments.Add(cvDocument);
        await _context.SaveChangesAsync();

        return Ok(
            new
            {
                message = "CV uploaded successfully.",
                cvDocument.Id,
                cvDocument.FileName,
                cvDocument.FileSize,
                cvDocument.UploadedAt,
                cvDocument.IsPrimary,
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
            .ToListAsync();

        return Ok(cvs);
    }

    [HttpGet("download/{id:int}")]
    public async Task<IActionResult> Download(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var cv = await _context.CvDocuments.FirstOrDefaultAsync(c => c.Id == id);
        if (cv == null)
        {
            return NotFound(new { message = "CV not found." });
        }

        var isAdmin = User.IsInRole("Admin");
        if (cv.UserId != userId && !isAdmin)
        {
            return Forbid();
        }

        var filePath = Path.Combine(_environment.WebRootPath, "uploads", "cvs", cv.StoredFileName);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "Stored file not found." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, cv.ContentType, cv.FileName);
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
        if (cv == null)
        {
            return NotFound(new { message = "CV not found." });
        }

        var isAdmin = User.IsInRole("Admin");
        if (cv.UserId != userId && !isAdmin)
        {
            return Forbid();
        }

        var filePath = Path.Combine(_environment.WebRootPath, "uploads", "cvs", cv.StoredFileName);
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
        }

        _context.CvDocuments.Remove(cv);
        await _context.SaveChangesAsync();

        return Ok(new { message = "CV deleted successfully." });
    }
}
