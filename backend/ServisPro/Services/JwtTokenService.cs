using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ServisPro.Models.Config;
using ServisPro.Models.Domain;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ServisPro.Services
{
    public class JwtTokenService : IJwtTokenService
    {
        private readonly JwtSettings _options;

        public JwtTokenService(IOptions<JwtSettings> options)
        {
            _options = options.Value;
        }
        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            TimeSpan lifetime = user.Role switch
            {
                UserRole.Admin => TimeSpan.FromMinutes(_options.AdminMinutes),
                UserRole.Service => TimeSpan.FromHours(_options.ServiceHours),
                _ => TimeSpan.FromMinutes(_options.ClientMinutes)
            };

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.Add(lifetime),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
