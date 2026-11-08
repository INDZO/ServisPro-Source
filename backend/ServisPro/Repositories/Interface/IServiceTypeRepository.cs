using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IServiceTypeRepository
    {
        Task<bool> AllExistAsync(IEnumerable<int> serviceTypeIds);
        Task<List<ServiceType>> GetByIdsAsync(IEnumerable<int> serviceTypeIds);
        Task<List<ServiceType>> GetAllAsync();
    }
}
