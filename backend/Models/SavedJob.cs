namespace findajob.Models
{
    public class SavedJob
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int JobPostingId { get; set; }
        public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    }
}
