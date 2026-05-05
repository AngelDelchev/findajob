namespace findajob.Models
{
    public class FriendRequest
    {
        public int Id { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string ReceiverId { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending, Accepted, Rejected
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation (optional, keeping it simple)
    }

    public class Friendship
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FriendId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
