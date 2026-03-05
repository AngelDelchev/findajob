namespace findajob.Models
{
    public class UserProfile
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string ProfessionalTitle { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Skills { get; set; } = string.Empty;
        public string ExperienceSummary { get; set; } = string.Empty;
        public string PreferredJobTypes { get; set; } = string.Empty;
        public string PreferredLocations { get; set; } = string.Empty;
    }
}
