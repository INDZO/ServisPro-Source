using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLServiceTypeRepository : IServiceTypeRepository
    {
        private readonly ServisProDbContext _context;

        public SQLServiceTypeRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<bool> AllExistAsync(IEnumerable<int> serviceTypeIds)
        {
            var ids = serviceTypeIds.Distinct().ToList();
            var count = await _context.ServiceTypes.CountAsync(st => ids.Contains(st.Id));
            return count == ids.Count;
        }

        public async Task<List<ServiceType>> GetAllAsync()
        {
            return await _context.ServiceTypes.ToListAsync();
        }

        public async Task<List<ServiceType>> GetByIdsAsync(IEnumerable<int> serviceTypeIds)
        {
            var ids = serviceTypeIds.Distinct().ToList();
            return await _context.ServiceTypes.Where(st => ids.Contains(st.Id)).ToListAsync();
        }
    }
}
