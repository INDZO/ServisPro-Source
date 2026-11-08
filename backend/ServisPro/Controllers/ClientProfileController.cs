using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;

namespace ServisPro.Controllers
{
    [Route("api/client/profile")]
    [ApiController]
    [Authorize(Roles = "Client")]
    public class ClientProfileController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IClientRepository _clientRepository;
        private readonly IPasswordHasher _passwordHasher;

        public ClientProfileController(IUserRepository userRepository, IClientRepository clientRepository, IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _clientRepository = clientRepository;
            _passwordHasher = passwordHasher;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            return int.TryParse(userIdClaim, out var userId) ? userId : -1;
        }


        [HttpGet]
        public async Task<ActionResult<ClientProfileDto>> GetProfile()
        {
            var userId = GetCurrentUserId();
            if(userId == -1)
                return Unauthorized();

            var client = await _clientRepository.GetByIdWithUserAsync(userId);

            if (client == null)
                return NotFound("Klijentski profil nije pronađen.");

            var dto = new ClientProfileDto
            {
                Email = client.User.Email,
                FullName = client.FullName,
                ImageUrl = client.ImageUrl
            };

            return Ok(dto);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateClientProfileRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var client = await _clientRepository.GetByUserIdAsync(userId);

            if (client == null)
                return NotFound("Klijentski profil nije pronađen.");

            client.FullName = request.FullName;
            await _clientRepository.SaveChangesAsync();

            return NoContent();
        }

        //[HttpPost("avatar")]
        //public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarRequest request)
        //imam u image controlleru obradjeno ovo

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return NotFound("Korisnik nije pronađen.");

            if (!_passwordHasher.VerifyPassword(user.Password, request.CurrentPassword))
                return BadRequest("Trenutna lozinka nije ispravna."); 

            user.Password = _passwordHasher.HashPassword(request.NewPassword); 
            await _userRepository.UpdateAsync(user); 

            return NoContent();
        }
    }
}