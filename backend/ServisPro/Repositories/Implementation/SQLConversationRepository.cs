using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLConversationRepository : IConversationRepository
    {
        private readonly ServisProDbContext _db;

        public SQLConversationRepository(ServisProDbContext db)
        {
            _db = db;
        }

        public async Task<Conversation?> GetConversationAsync(int conversationId)
        {
            return await _db.Conversations
                .Include(c => c.Client).ThenInclude(x => x.User)
                .Include(c => c.Service).ThenInclude(x => x.User)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId);
        }

        public async Task<List<Conversation>> GetUserConversationsAsync(int userId)
        {
            return await _db.Conversations
                .Include(c => c.Client).ThenInclude(x => x.User)
                .Include(c => c.Service).ThenInclude(x => x.User)
                .Include(c => c.Messages)
                .Where(c => c.Client.UserId == userId || c.Service.UserId == userId)
                .ToListAsync();
        }

        public async Task<List<ChatMessage>> GetMessagesAsync(int conversationId)
        {
            return await _db.ChatMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.SentAt)
                .ToListAsync();
        }

        public async Task<ChatMessage?> AddMessageAsync(int conversationId, int senderUserId, string message)
        {
            var conv = await GetConversationAsync(conversationId);
            if (conv == null)
                return null;

            var msg = new ChatMessage
            {
                ConversationId = conv.Id,
                SenderId = senderUserId,
                MessageText = message,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            _db.ChatMessages.Add(msg);
            await _db.SaveChangesAsync();
            return msg;
        }

        public async Task<Conversation> GetOrCreateConversationAsync(int clientUserId, int serviceUserId)
        {
            var client = await _db.Clients.FirstOrDefaultAsync(c => c.UserId == clientUserId);
            var service = await _db.Services.FirstOrDefaultAsync(c => c.UserId == serviceUserId);

            var existing = await _db.Conversations
                .Include(c => c.Client).Include(c => c.Service)
                .FirstOrDefaultAsync(c => c.ClientId == client!.Id && c.ServiceId == service!.Id);

            if (existing != null)
                return existing;

            var conv = new Conversation
            {
                ClientId = client!.Id,
                ServiceId = service!.Id
            };

            _db.Conversations.Add(conv);
            await _db.SaveChangesAsync();
            return conv;
        }

        public async Task MarkAsReadAsync(int conversationId, int userId)
        {
            var msgs = await _db.ChatMessages
                .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead)
                .ToListAsync();

            foreach (var m in msgs)
                m.IsRead = true;

            await _db.SaveChangesAsync();
        }
        public async Task<Conversation?> GetConversationBetweenAsync(int clientUserId, int serviceUserId)
        {
            var client = await _db.Clients.FirstOrDefaultAsync(c => c.UserId == clientUserId);
            var service = await _db.Services.FirstOrDefaultAsync(s => s.UserId == serviceUserId);

            if (client == null || service == null)
                return null;

            return await _db.Conversations
                .Include(c => c.Client).ThenInclude(x => x.User)
                .Include(c => c.Service).ThenInclude(x => x.User)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.ClientId == client.Id && c.ServiceId == service.Id);
        }

    }
}