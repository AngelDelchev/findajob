namespace findajob.Models
{
    public class Experience
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string StartDate { get; set; } = string.Empty;
        public string? EndDate { get; set; }
        public bool IsCurrent { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
