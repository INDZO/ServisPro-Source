using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLClientRepository : IClientRepository
    {
        private readonly ServisProDbContext _context;
        public SQLClientRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<Client> CreateAsync(Client client)
        {
            await _context.Clients.AddAsync(client);
            await _context.SaveChangesAsync();
            return client;
        }

        public async Task<bool> ExistsForUserAsync(int userId)
        {
            return await _context.Clients.AnyAsync(u => u.UserId == userId);
        }

        public async Task<Client?> GetByIdWithUserAsync(int userId)
        {
            return await _context.Clients
                                 .Include(c => c.User)
                                 .FirstOrDefaultAsync(c => c.UserId == userId);
        }

        public async Task<Client?> GetByUserIdAsync(int id)
        {
            return await _context.Clients.FirstOrDefaultAsync(c => c.UserId == id);
        }
        public Task SaveChangesAsync() => _context.SaveChangesAsync();

    }
}
