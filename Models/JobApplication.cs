namespace findajob.Models
{
    public class JobApplication
    {
        public int Id { get; set; }
        public int JobId { get; set; }
        public string ApplicantId { get; set; } = string.Empty;
        public string ApplicantEmail { get; set; } = string.Empty;
        public string ResumeUrl { get; set; } = string.Empty; // For now, just a link/text
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}
