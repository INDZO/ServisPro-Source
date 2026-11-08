namespace ServisPro.Models.DTO
{
    public class SendMessageRequest
    {
        public int ConversationId { get; set; }
        public int ReceiverUserId { get; set; }
        public string MessageText { get; set; } = string.Empty;
    }

    public class ConversationListItemDto
    {
        public int ConversationId { get; set; }
        public string OtherUserName { get; set; } = string.Empty;

        public string? LastMessage { get; set; }
        public DateTime? LastMessageAt { get; set; }

        public int UnreadCount { get; set; }
    }

    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string MessageText { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsMine { get; set; }
    }

}
