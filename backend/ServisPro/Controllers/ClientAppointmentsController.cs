using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;

namespace ServisPro.Controllers
{
    [Route("api/client/appointments")]
    [ApiController]
    [Authorize(Roles = "Client")]
    public class ClientAppointmentsController : ControllerBase
    {
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IEmailSender _emailSender;

        public ClientAppointmentsController(IAppointmentRepository appointmentRepository, IEmailSender emailSender)
        {
            _appointmentRepository = appointmentRepository;
            _emailSender = emailSender;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : -1;
        }

        // GET: api/client/appointments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppointmentListItemDto>>> GetMyAppointments(
            [FromQuery] AppointmentStatus? status)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var appointments = await _appointmentRepository
                .GetForClientAsync(userId, status);

            var result = appointments.Select(a => new AppointmentListItemDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                AppointmentTime = a.AppointmentTime,
                Status = a.Status.ToString(),
                ServiceId = a.ServiceId,
                ServiceName = a.Service?.Name ?? string.Empty,
                CarId = a.CarId,
                CarVin = a.Car?.VIN ?? string.Empty,
                CarBrand = a.Car?.CarBrand?.Name ?? string.Empty,
                CarModel = a.Car?.CarModel?.Name ?? string.Empty,
                ServiceTypeId = a.ServiceTypeId,
                ServiceTypeName = a.ServiceType?.Name ?? string.Empty
            }).ToList();

            return Ok(result);
        }

        // GET: api/client/appointments/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AppointmentListItemDto>> GetById(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var appointment = await _appointmentRepository.GetByIdForClientAsync(id, userId);

            if (appointment == null)
                return NotFound();

            var dto = new AppointmentListItemDto
            {
                Id = appointment.Id,
                AppointmentDate = appointment.AppointmentDate,
                AppointmentTime = appointment.AppointmentTime,
                Status = appointment.Status.ToString(),
                ServiceId = appointment.ServiceId,
                ServiceName = appointment.Service?.Name ?? string.Empty,
                CarId = appointment.CarId,
                CarVin = appointment.Car?.VIN ?? string.Empty,
                CarBrand = appointment.Car?.CarBrand?.Name ?? string.Empty,
                CarModel = appointment.Car?.CarModel?.Name ?? string.Empty,
                ServiceTypeId = appointment.ServiceTypeId,
                ServiceTypeName = appointment.ServiceType?.Name ?? string.Empty
            };

            return Ok(dto);
        }

        // POST: api/client/appointments
        [HttpPost]
        public async Task<ActionResult<AppointmentListItemDto>> Create([FromBody] CreateAppointmentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var appointment = await _appointmentRepository.CreateForClientAsync(
                userId,
                request.ServiceId,
                request.CarId,
                request.ServiceTypeId,
                request.AppointmentDate,
                request.AppointmentTime,
                request.Description
            );

            if (appointment == null)
                return BadRequest("Nije moguće kreirati termin. Proverite podatke.");

            var dto = new AppointmentListItemDto
            {
                Id = appointment.Id,
                AppointmentDate = appointment.AppointmentDate,
                AppointmentTime = appointment.AppointmentTime,
                Status = appointment.Status.ToString(),
                ServiceId = appointment.ServiceId,
                ServiceName = appointment.Service?.Name ?? string.Empty,
                CarId = appointment.CarId,
                CarVin = appointment.Car?.VIN ?? string.Empty,
                CarBrand = appointment.Car?.CarBrand?.Name ?? string.Empty,
                CarModel = appointment.Car?.CarModel?.Name ?? string.Empty,
                ServiceTypeId = appointment.ServiceTypeId,
                ServiceTypeName = appointment.ServiceType?.Name ?? string.Empty
            };

            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        // POST: api/client/appointments/{id}/cancel
        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelAppointmentRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            var success = await _appointmentRepository.CancelAsync(id, userId);

            if (!success)
                return BadRequest("Termin nije moguće otkazati.");

            var serviceEmail = await _appointmentRepository.GetServiceEmailAsync(id, userId);

            if (!string.IsNullOrEmpty(serviceEmail))
            {
                var subject = "Otkazivanje termina";
                var body = $"Termin sa ID-jem {id} je otkazan.";

                if (!string.IsNullOrEmpty(request.Reason))
                    body += $"\nRazlog: {request.Reason}";

                await _emailSender.SendEmailAsync(serviceEmail, subject, body);
            }

            return NoContent();
        }

        //GET: api/client/appointments/services/{serviceId}/calendar
        [HttpGet("services/{serviceId:int}/calendar")]
        public async Task<ActionResult<ServiceCalendarDto>> GetServiceCalendar(int serviceId)
        {
            var service = await _appointmentRepository.GetServiceByIdAsync(serviceId);
            if (service == null || !service.IsActive)
                return NotFound("Servis ne postoji ili nije aktivan.");

            // 1) Parse working days (podržava: Monday/Tuesday..., pon/uto..., Ponedeljak..., 1-7)
            HashSet<DayOfWeek> workingDays = ParseWorkingDays(service.WorkingDays);

            var today = DateTime.UtcNow.Date;
            var end = today.AddDays(30);

            var closedDays = await _appointmentRepository.GetClosedDaysAsync(serviceId);
            var appointments = await _appointmentRepository.GetAppointmentsForRangeAsync(serviceId, today, end);

            var dto = new ServiceCalendarDto
            {
                ServiceId = serviceId,
                From = today,
                To = end,

                // NOVO: pošalji radne dane kao DayOfWeek stringove (Monday, Tuesday...)
                WorkingDays = workingDays.Select(d => d.ToString()).ToList()
            };

            for (var date = today; date <= end; date = date.AddDays(1))
            {
                // 2) Neradan dan servisa NE ide u UnavailableDays (da se ne prikazuje “Neradan dan.”)
                //    Ali i dalje treba da bude onemogućen na frontu preko dto.WorkingDays.
                if (workingDays.Count > 0 && !workingDays.Contains(date.DayOfWeek))
                    continue;

                // 3) Eksplicitno zatvoreni dani (ovo korisnik treba da vidi kao “Zatvoreno: ...”)
                var closed = closedDays.FirstOrDefault(cd => cd.Date.Date == date.Date);
                if (closed != null)
                {
                    dto.UnavailableDays.Add(new UnavailableDayDto
                    {
                        Date = date,
                        Reason = $"Zatvoreno: {closed.Reason}"
                    });
                    continue;
                }

                // 4) (Ako imaš logiku za popunjen kapacitet, ostaje kako si imao)
                //    Primer: ako taj dan nema više mesta, dodaj u UnavailableDays.
                //    Ovaj deo ostavi kako već imaš u svom kodu (nisam ga dirao jer ga nisi ovde poslao kompletno).
                //
                //    Npr:
                //    if (IsFullyBooked(date, appointments, service)) { dto.UnavailableDays.Add(...); }
            }

            return Ok(dto);
        }

        private static HashSet<DayOfWeek> ParseWorkingDays(string? raw)
        {
            var set = new HashSet<DayOfWeek>();

            if (string.IsNullOrWhiteSpace(raw))
                return set;

            // split po zarezu / tački-zarezu / razmaku (da pokrije "pon uto" i "pon,uto")
            var tokens = raw
                .Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var t0 in tokens)
            {
                var t = (t0 ?? "").Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(t)) continue;

                // brojevi 1-7 (pon=1 ... ned=7)
                if (int.TryParse(t, out var n))
                {
                    switch (n)
                    {
                        case 1: set.Add(DayOfWeek.Monday); continue;
                        case 2: set.Add(DayOfWeek.Tuesday); continue;
                        case 3: set.Add(DayOfWeek.Wednesday); continue;
                        case 4: set.Add(DayOfWeek.Thursday); continue;
                        case 5: set.Add(DayOfWeek.Friday); continue;
                        case 6: set.Add(DayOfWeek.Saturday); continue;
                        case 7: set.Add(DayOfWeek.Sunday); continue;
                    }
                }

                // srpski skraceni
                if (t is "pon" or "ponedeljak") { set.Add(DayOfWeek.Monday); continue; }
                if (t is "uto" or "utorak") { set.Add(DayOfWeek.Tuesday); continue; }
                if (t is "sre" or "sreda") { set.Add(DayOfWeek.Wednesday); continue; }
                if (t is "cet" or "č et" or "čet" or "četvrtak" or "cetvrtak") { set.Add(DayOfWeek.Thursday); continue; }
                if (t is "pet" or "petak") { set.Add(DayOfWeek.Friday); continue; }
                if (t is "sub" or "subota") { set.Add(DayOfWeek.Saturday); continue; }
                if (t is "ned" or "nedelja" or "nedjelja") { set.Add(DayOfWeek.Sunday); continue; }

                // engleski DayOfWeek (Monday, Tuesday...)
                if (Enum.TryParse<DayOfWeek>(t0.Trim(), true, out var parsed))
                {
                    set.Add(parsed);
                    continue;
                }
            }

            return set;
        }

    }
}
