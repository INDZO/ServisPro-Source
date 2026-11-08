using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Service")]
    public class ServiceCarHistoryController : ControllerBase
    {
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IServiceRepository _serviceRepository;

        public ServiceCarHistoryController(IAppointmentRepository repo, IServiceRepository serviceRepository)
        {
            _appointmentRepository = repo;
            _serviceRepository = serviceRepository;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : -1;
        }

        private async Task<int> ResolveCurrentServiceId()
        {
            var userId = GetCurrentUserId();
            if (userId == -1) return -1;

            // isti pattern kao u ostalim servis kontrolerima: user -> service
            var service = await _serviceRepository.GetByUserIdFullAsync(userId);
            return service?.Id ?? -1;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CarHistoryDto>>> GetMyCarHistory()
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1)
                return Unauthorized();

            var history = await _appointmentRepository.GetForServiceAsync(serviceId);

            var today = DateTime.UtcNow.Date;

            var dto = history.Select(h => new CarHistoryDto
            {
                Id = h.Id,
                CarId = h.CarId,
                CarVin = h.Car?.VIN ?? "",
                CarBrand = h.Car?.CarBrand?.Name ?? "",
                CarModel = h.Car?.CarModel?.Name ?? "",
                AppointmentId = h.AppointmentId,
                ServiceTypeId = h.ServiceTypeId,
                ServiceTypeName = h.ServiceType.Name,
                Title = h.Title,
                Description = h.Description,
                Mileage = h.Mileage,
                ServiceDate = h.ServiceDate,
                CanUpdate = h.ServiceDate.Date == today
            });

            return Ok(dto);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateCarHistory(int id, [FromBody] CarHistoryUpdateRequest request)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1)
                return Unauthorized();

            var history = await _appointmentRepository.GetCarHistoryByIdAsync(id);
            if (history == null || history.ServiceId != serviceId)
                return NotFound();

            if (history.ServiceDate.Date != DateTime.UtcNow.Date)
                return BadRequest("Ovu stavku je moguce izmeniti samo na dan kada je kreirana.");

            history.Title = request.Title;
            history.Description = request.Description;
            history.Mileage = request.Mileage;

            await _appointmentRepository.UpdateCarHistoryAsync(history);

            return NoContent();
        }
    }
}