using ServisPro.Models.Domain;

namespace ServisPro.Services
{
    public interface IJwtTokenService
    {
        string GenerateToken(User user);
    }
}
