using System.ComponentModel.DataAnnotations;

namespace findajob.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string SenderUserId { get; set; } = string.Empty;
        public string ReceiverUserId { get; set; } = string.Empty;
        public int? JobApplicationId { get; set; }

        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        public bool IsRead { get; set; }

        /// <summary>
        /// Per-side deletion. Deleting a conversation used to remove the rows outright,
        /// which erased the thread from the other person's inbox too. Each side now
        /// hides its own copy, and the row is removed once neither side can see it.
        /// </summary>
        public bool DeletedBySender { get; set; }

        public bool DeletedByReceiver { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
