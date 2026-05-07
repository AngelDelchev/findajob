namespace findajob.Models
{
    public class UserProfile
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = "";
        public string ProfessionalTitle { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;

        // New employer fields
        public string CompanySize { get; set; } = "";
        public string Industry { get; set; } = "";
        public string TechStack { get; set; } = ""; // Comma separated
        public string Benefits { get; set; } = ""; // Comma separated

        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string City { get; set; } = "";
        public string PostalCode { get; set; } = "";
        public string Country { get; set; } = "";
        public string AvatarFileName { get; set; } = "";
        public string BannerFileName { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
