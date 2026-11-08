using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IClientRepository
    {
        Task<bool> ExistsForUserAsync(int userId);
        Task<Client> CreateAsync(Client client);
        Task<Client?> GetByUserIdAsync(int id);
        Task<Client?> GetByIdWithUserAsync(int userId);
        Task SaveChangesAsync();


    }
}
