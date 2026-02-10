using Microsoft.AspNetCore.Identity;

namespace findajob.Models;

public class ApplicationUser : IdentityUser
{
    public string? CompanyName { get; set; } // Employer field
    public string? ProfessionalTitle { get; set; } // Seeker field
    public byte[]? ResumeBlob { get; set; } // Store resumes <100KB directly in SQLite for 35% better performance [1, 2]
    //public string? UserName { get; set; }
    //public string? Email { get; set; }
    //public string? password { get; set; }
}
