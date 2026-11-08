using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLServiceRepository : IServiceRepository
    {
        private readonly ServisProDbContext _context;

        public SQLServiceRepository(ServisProDbContext db)
        {
            _context = db;
        }

        public async Task<bool> ExistsForUserAsync(int userId)
        {
            return await _context.Services.AnyAsync(s => s.UserId == userId);
        }

        public async Task<Service> CreateAsync(Service service, IEnumerable<int> serviceTypeIds)
        {
            _context.Services.Add(service);
            await _context.SaveChangesAsync();


            var links = serviceTypeIds.Distinct()
                .Select(id => new ServiceServiceType
                {
                    ServiceId = service.Id,
                    ServiceTypeId = id
                });

            _context.ServiceServiceTypes.AddRange(links);
            await _context.SaveChangesAsync();

            return service;
        }

        public async Task<List<PendingServiceDto>> GetPendingServicesAsync()
        {
            return await _context.Services
                .Include(s => s.User)
                .Where(s => s.User.Role == UserRole.Service && !s.User.IsApproved)
                .Select(s => new PendingServiceDto
                {
                    ServiceId = s.Id,
                    ServiceName = s.Name,
                    Description = s.Description,
                    PIB = s.PIB,
                    Email = s.User.Email,
                    Adress = s.Adress,
                    City = s.City,
                    OwnerFullName = s.OwnerFullName,
                    PhoneNumber = s.PhoneNumber
                })
                .ToListAsync();
        }

        public async Task<Service?> GetByIdWithUserAsync(int serviceId)
        {
            return await _context.Services
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == serviceId);
        }

        public async Task DeleteAsync(Service service, User user)
        {
            _context.Services.Remove(service);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }
        public async Task<(List<Service> Services, int TotalCount)> GetPublicServicesAsync(
             string? city,
             string? search,
             List<int> serviceTypeIds,
             string? workingDay,
             string? sortBy,
             string? sortDirection,
             int pageNumber,
             int pageSize)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _context.Services
                .Include(s => s.User)
                .Include(s => s.ServiceServiceTypes)
                    .ThenInclude(sst => sst.ServiceType)
                .Include(s => s.Reviews)
                .Where(s => s.IsActive &&
                            s.User.IsApproved &&
                            s.User.Role == UserRole.Service)
                .AsQueryable();

            // ------------------------
            // Pretraga po gradu
            // ------------------------
            if (!string.IsNullOrWhiteSpace(city))
            {
                var cityTrim = city.Trim();
                query = query.Where(s => EF.Functions.Like(s.City, $"%{cityTrim}%"));
            }

            // ------------------------
            // Pretraga po nazivu
            // ------------------------
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTrim = search.Trim();
                query = query.Where(s => EF.Functions.Like(s.Name, $"%{searchTrim}%"));
            }

            // ------------------------
            // Filter tipova usluga
            // ------------------------
            if (serviceTypeIds != null && serviceTypeIds.Any())
            {
                query = query.Where(s =>
                    s.ServiceServiceTypes.Any(sst => serviceTypeIds.Contains(sst.ServiceTypeId)));
            }

            // ------------------------
            // Filter po radnom danu
            // ------------------------
            if (!string.IsNullOrWhiteSpace(workingDay))
            {
                var day = workingDay.Trim().ToLower();

                query = query.Where(s =>
                    EF.Functions.Like("," + s.WorkingDays.ToLower() + ",", $"%,{day},%"));
            }


            // ------------------------
            // Sortiranje
            // ------------------------
            bool desc = sortDirection?.ToLower() == "desc";
            sortBy = sortBy?.ToLower() ?? "name";

            query = sortBy switch
            {
                "rating" => desc
                    ? query.OrderByDescending(s => s.Reviews.Average(r => (double?)r.Rating) ?? 0)
                    : query.OrderBy(s => s.Reviews.Average(r => (double?)r.Rating) ?? 0),

                "reviews" => desc
                    ? query.OrderByDescending(s => s.Reviews.Count)
                    : query.OrderBy(s => s.Reviews.Count),

                _ => desc
                    ? query.OrderByDescending(s => s.Name)
                    : query.OrderBy(s => s.Name)
            };


            // ------------------------
            // Paging
            // ------------------------
            var totalCount = await query.CountAsync();

            var result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (result, totalCount);
        }



        public async Task<Service?> GetPublicServiceWithDetailsAsync(int id)
        {
            return await _context.Services
                .Include(s => s.User)
                .Include(s => s.ServiceServiceTypes)
                    .ThenInclude(sst => sst.ServiceType)
                .Include(s => s.Reviews)
                    .ThenInclude(r => r.Client)
                .Where(s => s.IsActive &&
                            s.User.IsApproved &&
                            s.User.Role == UserRole.Service &&
                            s.Id == id)
                .FirstOrDefaultAsync();
        }


        public async Task<Service?> GetByUserIdAsync(int id)
        {
            return await _context.Services
                .FirstOrDefaultAsync(s => s.UserId == id);
        }

        public async Task<Service?> GetByUserIdFullAsync(int userId)
        {
            return await _context.Services
                .Include(s => s.ServiceServiceTypes)
                    .ThenInclude(sst => sst.ServiceType)
                .FirstOrDefaultAsync(s => s.UserId == userId);
        }

        public async Task UpdateServiceTypesAsync(Service service, List<int> typeIds)
        {
            var existing = _context.ServiceServiceTypes
                .Where(sst => sst.ServiceId == service.Id);

            _context.ServiceServiceTypes.RemoveRange(existing);

            foreach (var id in typeIds.Distinct())
            {
                _context.ServiceServiceTypes.Add(new ServiceServiceType
                {
                    ServiceId = service.Id,
                    ServiceTypeId = id
                });
            }

            await _context.SaveChangesAsync();
        }


        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

    }
}
