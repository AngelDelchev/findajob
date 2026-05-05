namespace findajob.Models
{
    public class BlockedUser
    {
        public int Id { get; set; }
        public string BlockerId { get; set; } = string.Empty;
        public string BlockedId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
