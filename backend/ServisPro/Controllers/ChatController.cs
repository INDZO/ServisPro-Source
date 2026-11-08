using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly IConversationRepository _repo;

        public ChatController(IConversationRepository repo)
        {
            _repo = repo;
        }

        private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        private bool HasAccess(Conversation c)
        {
            return c.Client.UserId == UserId || c.Service.UserId == UserId;
        }

        //GET api/chat/conversations
        [HttpGet("conversations")]
        public async Task<ActionResult> GetMyConversations()
        {
            var convos = await _repo.GetUserConversationsAsync(UserId);

            var list = convos.Select(c =>
            {
                var last = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault();

                string otherName = c.Client.UserId == UserId ? c.Service.Name : c.Client.FullName;

                return new ConversationListItemDto
                {
                    ConversationId = c.Id,
                    OtherUserName = otherName,
                    LastMessage = last?.MessageText,
                    LastMessageAt = last?.SentAt,
                    UnreadCount = c.Messages.Count(m => !m.IsRead && m.SenderId != UserId)
                };
            }).OrderByDescending(c => c.LastMessageAt).ToList();

            return Ok(list);
        }

        //GET api/chat/{conversationId}/messages
        [HttpGet("{conversationId}/messages")]
        public async Task<ActionResult> GetMessages(int conversationId)
        {
            var conv = await _repo.GetConversationAsync(conversationId);
            if (conv == null || !HasAccess(conv)) return Forbid();

            var msgs = await _repo.GetMessagesAsync(conversationId);

            var result = msgs.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                MessageText = m.MessageText,
                SentAt = m.SentAt,
                IsMine = m.SenderId == UserId
            });

            await _repo.MarkAsReadAsync(conversationId, UserId);

            return Ok(result);
        }

        //POST api/chat/send
        [HttpPost("send")]
        public async Task<ActionResult> SendMessage(SendMessageRequest req)
        {
            Conversation? conv = null;

            if (req.ConversationId == 0)
            {
                conv = await _repo.GetOrCreateConversationAsync(UserId, req.ReceiverUserId);
            }
            else
            {
                conv = await _repo.GetConversationAsync(req.ConversationId);
                if (conv == null || !HasAccess(conv))
                    return Forbid();
            }

            var msg = await _repo.AddMessageAsync(conv.Id, UserId, req.MessageText);
            if (msg == null) return BadRequest();

            return Ok(new ChatMessageDto
            {
                Id = msg.Id,
                ConversationId = msg.ConversationId,
                MessageText = msg.MessageText,
                SentAt = msg.SentAt,
                IsMine = true
            });
        }


        // GET api/chat/between?serviceUserId=5&clientUserId=10
        [HttpGet("between")]
        public async Task<ActionResult> GetBetween(int serviceUserId, int clientUserId)
        {
            if (UserId != serviceUserId && UserId != clientUserId)
                return Forbid();

            var conv = await _repo.GetConversationBetweenAsync(clientUserId, serviceUserId);

            return Ok(new
            {
                conversationId = conv?.Id ?? 0
            });
        }

    }
}
