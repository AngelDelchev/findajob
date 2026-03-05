namespace findajob.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string SenderUserId { get; set; } = string.Empty;
        public string ReceiverUserId { get; set; } = string.Empty;
        public int? JobApplicationId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
