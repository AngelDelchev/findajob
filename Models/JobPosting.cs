namespace findajob.Models
{
    public class JobPosting
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Salary { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public bool IsDeleted { get; set; } // For soft-deletes
        public DateTime PostedDate { get; set; } = DateTime.UtcNow;
        public string EmployerId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string OwnerId { get; set; } = string.Empty;
    }
}
