namespace findajob.Models
{
    public class JobPosting
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Salary { get; set; }
        public bool IsDeleted { get; set; } // For soft-deletes
        public DateTime PostedDate { get; set; } = DateTime.UtcNow;
        public string EmployerId { get; set; } = string.Empty;
    }
}
