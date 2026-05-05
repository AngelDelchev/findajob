namespace findajob.Models
{
    public class JobPosting
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string CompanyDescription { get; set; } = string.Empty;
        public string Salary { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string JobType { get; set; } = "Full-time";
        public string WorkMode { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string SeniorityLevel { get; set; } = string.Empty;
        public string Requirements { get; set; } = string.Empty;
        public string Responsibilities { get; set; } = string.Empty;
        public string Benefits { get; set; } = string.Empty;
        public DateTime? Deadline { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime PostedDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string OwnerId { get; set; } = string.Empty;

        public List<JobPostingTag> JobPostingTags { get; set; } = new();

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public List<string> Tags { get; set; } = new();
    }
}
