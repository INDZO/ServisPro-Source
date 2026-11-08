namespace ServisPro.Models.Domain
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public string MessageText { get; set; } = null!;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; }

        public int ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public int SenderId { get; set; }
        public User Sender { get; set; } = null!;
    }
}
