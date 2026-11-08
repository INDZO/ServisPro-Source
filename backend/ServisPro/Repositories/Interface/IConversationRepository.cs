using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IConversationRepository
    {
        Task<Conversation?> GetConversationAsync(int conversationId);

        Task<List<Conversation>> GetUserConversationsAsync(int userId);

        Task<List<ChatMessage>> GetMessagesAsync(int conversationId);

        Task<ChatMessage?> AddMessageAsync(int conversationId, int senderUserId, string message);

        Task<Conversation> GetOrCreateConversationAsync(int clientUserId, int serviceUserId);

        Task MarkAsReadAsync(int conversationId, int userId);

        Task<Conversation?> GetConversationBetweenAsync(int clientUserId, int serviceUserId);
    }
}
