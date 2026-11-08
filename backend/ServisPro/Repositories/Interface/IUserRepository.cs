using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByIdAsync(int id);

        Task<bool> EmailExistsAsync(string email);

        Task<User> CreateAsync(User user);

        Task<User> UpdateAsync(User user);

        Task SaveChangesAsync();
    }
}
