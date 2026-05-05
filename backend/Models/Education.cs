namespace findajob.Models
{
    public class Education
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string School { get; set; } = string.Empty;
        public string Degree { get; set; } = string.Empty;
        public string FieldOfStudy { get; set; } = string.Empty;
        public string StartYear { get; set; } = string.Empty;
        public string? EndYear { get; set; }
    }
}
