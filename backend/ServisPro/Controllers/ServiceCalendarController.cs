using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Service")]
    public class ServiceCalendarController : ControllerBase
    {
        private readonly IClosedDaysRepository _repo;
        private readonly IServiceRepository _serviceRepository;
        private readonly IEmailSender _email;

        public ServiceCalendarController(
            IClosedDaysRepository repo,
            IServiceRepository serviceRepository,
            IEmailSender email)
        {
            _repo = repo;
            _serviceRepository = serviceRepository;
            _email = email;
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

        // POST: /api/ServiceCalendar
        [HttpPost]
        public async Task<IActionResult> CloseDay([FromBody] ClosedDayRequestDTO dto)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var date = dto.Date.Date;

            var existing = await _repo.GetByDateAsync(date, serviceId);
            if (existing != null)
                return BadRequest("Ovaj dan je vec zatvoren.");

            var closed = new ClosedDays
            {
                Date = date,
                Reason = dto.Reason,
                ServiceId = serviceId
            };

            await _repo.CreateAsync(closed);

            var appointments = await _repo.GetAppointmentsForDateAsync(date, serviceId);

            foreach (var a in appointments.Where(x => x.Status == AppointmentStatus.Requested))
            {
                a.Status = AppointmentStatus.Rejected;
                await _repo.UpdateAppointmentAsync(a);

                await _email.SendEmailAsync(
                    a.Client.User.Email,
                    "Servis – Zatvoren dan",
                    $"Poštovani,\n\n" +
                    $"Vaš termin zakazan za {a.AppointmentDate:dd.MM.yyyy} je odbijen jer je servis zatvoren.\n" +
                    $"Razlog: {dto.Reason ?? "Nije naveden"}.\n\n" +
                    $"Molimo vas da izaberete novi termin.\n" +
                    $"Srdačan pozdrav,\nServisPro tim"
                );
            }

            // KLJUČNO: ne vraćaj EF entitet -> vraćaj mali payload (nema ciklusa)
            return Ok(new { id = closed.Id, date = closed.Date.ToString("yyyy-MM-dd") });
        }

        // DELETE: /api/ServiceCalendar/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            // opcionalno: možeš validirati da ovaj closedDay pripada servisu
            var entity = await _repo.GetByIdAsync(id);
            if (entity == null) return NotFound();
            if (entity.ServiceId != serviceId) return Forbid();

            var deleted = await _repo.DeleteAsync(id);
            if (!deleted) return NotFound();

            return NoContent();
        }

        // PUT: /api/ServiceCalendar/{id}/decision?isAccepted=true
        [HttpPut("{id}/decision")]
        public async Task<IActionResult> DecideAppointment(int id, [FromQuery] bool isAccepted)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var appointment = await _repo.GetByIdAppAsync(id);

            if (appointment == null)
                return NotFound("Appointment nije nadjen.");

            if (appointment.ServiceId != serviceId)
                return Forbid();

            if (appointment.Status != AppointmentStatus.Requested)
                return BadRequest("Samo requested zahtevi.");

            appointment.Status = isAccepted
                ? AppointmentStatus.Accepted
                : AppointmentStatus.Rejected;

            await _repo.UpdateAppointmentAsync(appointment);

            var email = appointment.Client.User.Email;
            var subject = isAccepted
                ? "Vaš termin je odobren"
                : "Vaš termin je odbijen";

            var message = isAccepted
                ? $"Poštovani,\n\nVaš termin zakazan za {appointment.AppointmentDate:dd.MM.yyyy} je uspešno odobren.\n\nSrdačan pozdrav."
                : $"Poštovani,\n\nŽao nam je, ali vaš zahtev za termin zakazan za {appointment.AppointmentDate:dd.MM.yyyy} je odbijen.\n\nSrdačan pozdrav.";

            await _email.SendEmailAsync(email, subject, message);

            return Ok(new { appointment.Id, Status = appointment.Status.ToString() });
        }

        // GET: /api/ServiceCalendar?year=2026&month=1
        [HttpGet]
        public async Task<IActionResult> GetCalendar([FromQuery] int year = 0, [FromQuery] int month = 0)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            if (year <= 0) year = DateTime.Now.Year;
            if (month <= 0) month = DateTime.Now.Month;

            if (year < 1 || month < 1 || month > 12)
                return BadRequest("Neispravna godina ili mesec.");

            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);

            var service = await _repo.GetServiceByIdAsync(serviceId);
            if (service == null) return NotFound("Service nije pronadjen.");

            var workingDays = new List<string>();
            if (!string.IsNullOrWhiteSpace(service.WorkingDays))
            {
                workingDays = service.WorkingDays
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();
            }

            var closedDates = await _repo.GetClosedDaysAsync(serviceId, start, end);
            var closedDaysStrings = closedDates
                .Select(d => d.ToString("yyyy-MM-dd"))
                .OrderBy(s => s)
                .ToList();

            var appointments = await _repo.GetAppointmentsForServiceAsync(serviceId, start, end);

            var apptDtos = appointments.Select(a =>
            {
                var appointmentStart = a.AppointmentDate.Date + (a.AppointmentTime ?? TimeSpan.Zero);

                return new CalendarAppointmentDto
                {
                    Id = a.Id,
                    Title = $"{a.Service?.Name ?? "Usluga"} - {a.Car.CarModel}",
                    Start = appointmentStart,
                    Status = a.Status.ToString(),
                    Color = MapColor(a.Status),
                    Description = a.Description
                };
            }).ToList();

            var grouped = apptDtos
                .GroupBy(d => d.Start.Date)
                .OrderBy(g => g.Key)
                .Select(g => new CalendarDayDto
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Appointments = g.OrderBy(a => a.Start).ToList()
                })
                .ToList();

            var response = new CalendarResponseDto
            {
                WorkingDays = workingDays,
                ClosedDays = closedDaysStrings,
                Days = grouped
            };

            return Ok(response);
        }

        // GET: /api/ServiceCalendar/closed?date=2026-01-13
        [HttpGet("closed")]
        public async Task<IActionResult> GetClosedDayId([FromQuery] DateTime date)
        {
            var serviceId = await ResolveCurrentServiceId();
            if (serviceId == -1) return Unauthorized();

            var existing = await _repo.GetByDateAsync(date.Date, serviceId);
            if (existing == null) return NotFound();

            return Ok(new { id = existing.Id });
        }

        private static string MapColor(AppointmentStatus status)
        {
            return status switch
            {
                AppointmentStatus.Requested => "blue",
                AppointmentStatus.Rejected or AppointmentStatus.Canceled => "red",
                _ => "green"
            };
        }
    }
}