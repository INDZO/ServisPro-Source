using ServisPro.Models.Domain;
using ServisPro.Models.DTO;

namespace ServisPro.Repositories.Interface
{
    public interface IServiceRepository
    {
        Task<bool> ExistsForUserAsync(int userId);
        Task<Service> CreateAsync(Service service, IEnumerable<int> serviceTypeIds);

        Task<Service?> GetByIdWithUserAsync(int serviceId);
        Task<Service?> GetByUserIdAsync(int userId);
        Task<Service?> GetByUserIdFullAsync(int userId);

        Task UpdateServiceTypesAsync(Service service, List<int> typeIds);

        Task<List<PendingServiceDto>> GetPendingServicesAsync();
        Task<(List<Service> Services, int TotalCount)> GetPublicServicesAsync(
            string? city,
            string? search,
            List<int> serviceTypeIds,
            string? workingDay,
            string? sortBy,
            string? sortDirection,
            int pageNumber,
            int pageSize
        );

        Task<Service?> GetPublicServiceWithDetailsAsync(int id);

        Task DeleteAsync(Service service, User user);

        Task SaveChangesAsync();
    }
}
