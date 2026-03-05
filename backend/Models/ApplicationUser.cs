using Microsoft.AspNetCore.Identity;

namespace findajob.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string? CompanyName { get; set; }
        public string? ProfessionalTitle { get; set; }
        public byte[]? ResumeBlob { get; set; }
    }
}
