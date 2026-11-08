using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;
using ServisPro.Services;

namespace ServisPro.Controllers
{
    [Route("api/service/appointments")]
    [ApiController]
    [Authorize(Roles = "Service")]
    public class ServiceAppointmentsController : ControllerBase
    {
        private readonly IServiceAppointment _repo;
        private readonly IEmailSender _emailSender;
        private readonly IServiceRepository _serviceRepository;

        public ServiceAppointmentsController(
            IServiceAppointment repo,
            IEmailSender emailSender,
            IServiceRepository serviceRepository)
        {
            _repo = repo;
            _emailSender = emailSender;
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

            var service = await _serviceRepository.GetByUserIdFullAsync(userId);
            return service?.Id ?? -1;
        }

        // GET: api/service/appointments/daily
        [HttpGet("daily")]
        public async Task<ActionResult<IEnumerable<ServiceDailyAppointmentDto>>> GetDaily([FromQuery] string? filter)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var list = new List<Appointment>();
            filter = (filter ?? "AllActive").Trim();

            if (filter.Equals("Accepted", StringComparison.OrdinalIgnoreCase))
            {
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.Accepted, today));
            }
            else if (filter.Equals("InService", StringComparison.OrdinalIgnoreCase))
            {
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.InService));
            }
            else if (filter.Equals("InProgress", StringComparison.OrdinalIgnoreCase))
            {
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.InProgress));
            }
            else // AllActive
            {
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.Accepted, today));
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.InService));
                list.AddRange(await _repo.GetAppointmentsForServiceAsync(serviceId, AppointmentStatus.InProgress));
            }

            var dto = list
                .OrderByDescending(a => a.AppointmentDate)
                .ThenByDescending(a => a.Id)
                .Select(a => new ServiceDailyAppointmentDto
                {
                    Id = a.Id,
                    AppointmentDate = a.AppointmentDate,
                    AppointmentTime = a.AppointmentTime,
                    Status = a.Status.ToString(),
                    ClientId = a.ClientId,
                    ClientFullName = a.Client?.FullName ?? "",
                    ClientEmail = a.Client?.User?.Email ?? "",
                    CarId = a.CarId,
                    CarVin = a.Car?.VIN ?? "",
                    CarBrand = a.Car?.CarBrand?.Name ?? "",
                    CarModel = a.Car?.CarModel?.Name ?? "",
                    ServiceTypeId = a.ServiceTypeId,
                    ServiceTypeName = a.ServiceType?.Name ?? "",
                    Description = a.Description ?? ""
                })
                .ToList();

            return Ok(dto);
        }

        private async Task<Appointment?> LoadAndVerifyAsync(int appointmentId, int serviceId)
        {
            return await _repo.GetAppointmentByIdForServiceAsync(appointmentId, serviceId);
        }

        // ARRIVED
        [HttpPost("{id:int}/arrived")]
        public async Task<IActionResult> MarkArrived(int id)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(id, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.Accepted)
                return BadRequest("Appointment mora biti accepted.");

            appointment.Status = AppointmentStatus.InService;
            await _repo.UpdateAppointmentAsync(appointment);

            var email = appointment.Client?.User?.Email;
            if (!string.IsNullOrEmpty(email))
            {
                await _emailSender.SendEmailAsync(
                    email,
                    "Vozilo je stiglo u servis",
                    $"Vaše vozilo (termin {appointment.AppointmentDate:yyyy-MM-dd}) je stiglo u servis."
                );
            }

            return NoContent();
        }

        // START WORK
        [HttpPost("{id:int}/start")]
        public async Task<IActionResult> StartWork(int id)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(id, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.InService)
                return BadRequest("Appointment mora biti InService da bi startovali.");

            appointment.Status = AppointmentStatus.InProgress;
            await _repo.UpdateAppointmentAsync(appointment);

            var email = appointment.Client?.User?.Email;
            if (!string.IsNullOrEmpty(email))
            {
                await _emailSender.SendEmailAsync(
                    email,
                    "Rad na vozilu je započet",
                    $"Rad na vašem vozilu (termin {appointment.AppointmentDate:yyyy-MM-dd}) je započet."
                );
            }

            return NoContent();
        }

        // PAUSE WORK
        [HttpPost("{id:int}/pause")]
        public async Task<IActionResult> PauseWork(int id)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(id, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.InProgress)
                return BadRequest("Appointment mora biti InProgress za pause.");

            appointment.Status = AppointmentStatus.InService;
            await _repo.UpdateAppointmentAsync(appointment);

            return NoContent();
        }

        // COMPLETE + HISTORY
        [HttpPost("{appointmentId:int}/complete")]
        public async Task<IActionResult> CompleteAppointment(int appointmentId, [FromBody] CompleteAppointmentDto model)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(appointmentId, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.InProgress)
                return BadRequest("Appointment mora biti InProgress pre kompletiranja.");

            var history = new CarHistory
            {
                CarId = appointment.CarId,
                ServiceId = appointment.ServiceId,
                AppointmentId = appointment.Id,
                ServiceTypeId = appointment.ServiceTypeId,
                Title = model.Title,
                Description = model.Description,
                Mileage = model.Mileage,
                ServiceDate = DateTime.Now
            };

            await _repo.AddHistoryAsync(history);

            appointment.Status = AppointmentStatus.Completed;
            await _repo.UpdateAppointmentAsync(appointment);

            await _emailSender.SendEmailAsync(
                appointment.Client.User.Email,
                "Vaše vozilo je završeno",
                "Poštovani, servisiranje vašeg vozila je završeno. Vozilo je spremno za preuzimanje."
            );

            return Ok(new { message = "Appointment completed successfully." });
        }

        // CANCEL BY SERVICE
        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> CancelByService(int id, [FromBody] string? reason)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(id, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.Canceled or AppointmentStatus.Rejected)
                return BadRequest("Appointment je vec otkazan ili zavrsen.");

            appointment.Status = AppointmentStatus.Canceled;
            await _repo.UpdateAppointmentAsync(appointment);

            var email = appointment.Client?.User?.Email;
            if (!string.IsNullOrEmpty(email))
            {
                var body = $"Vaš termin {appointment.AppointmentDate:yyyy-MM-dd} je otkazan od strane servisa.";
                if (!string.IsNullOrWhiteSpace(reason))
                    body += $"\nRazlog: {reason}";

                await _emailSender.SendEmailAsync(email, "Termin otkazan", body);
            }

            return NoContent();
        }

        // REJECT
        [HttpPost("{id:int}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectAppointmentRequest request)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await LoadAndVerifyAsync(id, serviceId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.Requested)
                return BadRequest("Only Requested can be rejected.");

            if (string.IsNullOrWhiteSpace(request?.Reason))
                return BadRequest("Reason required.");

            appointment.Status = AppointmentStatus.Rejected;
            await _repo.UpdateAppointmentAsync(appointment);

            var email = appointment.Client?.User?.Email;
            if (!string.IsNullOrEmpty(email))
            {
                await _emailSender.SendEmailAsync(
                    email,
                    "Zahtev odbijen",
                    $"Vaš zahtev za termin je odbijen.\nRazlog: {request.Reason}"
                );
            }

            return NoContent();
        }
    }
}