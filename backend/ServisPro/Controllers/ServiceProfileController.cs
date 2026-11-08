using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Service")]
    public class ServiceProfileController : ControllerBase
    {
        private readonly IServiceRepository _serviceRepository;
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;

        public ServiceProfileController(
            IServiceRepository serviceRepository,
            IUserRepository userRepository,
            IPasswordHasher passwordHasher)
        {
            _serviceRepository = serviceRepository;
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var id) ? id : -1;
        }


        [HttpGet]
        public async Task<ActionResult<ServiceProfileDto>> GetProfile()
        {
            var userId = GetCurrentUserId();
            if (userId == -1) return Unauthorized();

            var service = await _serviceRepository.GetByUserIdFullAsync(userId);
            if (service == null) return NotFound("Servis nije pronađen.");

            var dto = new ServiceProfileDto
            {
                ServiceId = service.Id,
                Name = service.Name,
                PIB = service.PIB,
                Description = service.Description,
                Adress = service.Adress,
                City = service.City,
                WorkingHours = service.WorkingHours,
                WorkingDays = service.WorkingDays.Split(',').ToList(),
                OwnerFullName = service.OwnerFullName,
                PhoneNumber = service.PhoneNumber,
                ImageUrl = service.ImageUrl,
                GoogleMapsLink = service.GoogleMapsLink,
                ServiceTypes = service.ServiceServiceTypes.Select(x => x.ServiceType.Name).ToList()
            };

            return Ok(dto);
        }


        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateServiceProfileRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1) return Unauthorized();

            var service = await _serviceRepository.GetByUserIdAsync(userId);
            if (service == null) return NotFound("Servis nije pronađen.");

            service.Name = request.Name;
            service.PIB = request.PIB;
            service.Description = request.Description;
            service.Adress = request.Adress;
            service.City = request.City;
            service.WorkingHours = request.WorkingHours;
            service.WorkingDays = string.Join(",", request.WorkingDays);
            service.OwnerFullName = request.OwnerFullName;
            service.PhoneNumber = request.PhoneNumber;
            service.GoogleMapsLink = request.GoogleMapsLink;

            await _serviceRepository.SaveChangesAsync();
            return NoContent();
        }

        //[HttpPost("image")]
        //public async Task<IActionResult> UpdateImage([FromBody] UpdateServiceImageRequest request)
        //imam u image controller vec logiku
        
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("Korisnik nije pronađen.");

            if (!_passwordHasher.VerifyPassword(user.Password, request.CurrentPassword))
                return BadRequest("Trenutna lozinka nije ispravna.");

            user.Password = _passwordHasher.HashPassword(request.NewPassword);
            await _userRepository.UpdateAsync(user);

            return NoContent();
        }


        [HttpPut("service-types")]
        public async Task<IActionResult> UpdateServiceTypes([FromBody] UpdateServiceTypesRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == -1) return Unauthorized();

            var service = await _serviceRepository.GetByUserIdFullAsync(userId);
            if (service == null) return NotFound("Servis nije pronađen.");

            await _serviceRepository.UpdateServiceTypesAsync(service, request.TypeIds);

            return NoContent();
        }
    }
}
