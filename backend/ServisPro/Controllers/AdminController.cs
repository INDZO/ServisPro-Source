using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminRepository _adminRepository;
    private readonly IEmailSender _emailSender;

    public AdminController(IAdminRepository adminRepository, IEmailSender emailSender)
    {
        _adminRepository = adminRepository;
        _emailSender = emailSender;
    }

    // ====== HELPERS ======
    private static string PickReason(AdminActionReasonDto? body, string? reasonQuery)
    {
        var r = body?.Reason;
        if (string.IsNullOrWhiteSpace(r)) r = reasonQuery;
        return (r ?? string.Empty).Trim();
    }

    private async Task<bool> TrySendEmailAsync(string? to, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(to)) return false;
        try
        {
            await _emailSender.SendEmailAsync(to, subject, body);
            return true;
        }
        catch
        {
            // Email failure must not block admin workflow
            return false;
        }
    }

    // ====== SERVISI ======
    // GET: api/admin/services
    [HttpGet("services")]
    public async Task<IActionResult> GetServices([FromQuery] bool? isActive = null, [FromQuery] bool? isApproved = null)
    {
        var services = await _adminRepository.GetServicesAsync(isActive, isApproved);

        var result = services.Select(s => new AdminServiceListDto
        {
            ServiceId = s.Id,
            Name = s.Name,
            City = s.City,
            PIB = s.PIB,
            OwnerFullName = s.OwnerFullName,
            Email = s.User?.Email ?? "",
            IsActive = s.IsActive,
            IsApproved = s.User?.IsApproved ?? false
        }).ToList();

        return Ok(result);
    }


    // GET: api/admin/pending-services
    [HttpGet("pending-services")]
    public async Task<ActionResult<IEnumerable<AdminPendingServiceDto>>> GetPendingServices()
    {
        var services = await _adminRepository.GetPendingServicesAsync();

        var result = services.Select(s => new AdminPendingServiceDto
        {
            ServiceId = s.Id,
            Name = s.Name,
            City = s.City,
            PIB = s.PIB,
            OwnerFullName = s.OwnerFullName,
            Email = s.User?.Email ?? string.Empty
        });

        return Ok(result);
    }


    // GET: api/admin/services/{id}
    [HttpGet("services/{id:int}")]
    public async Task<IActionResult> GetServiceById(int id)
    {
        var service = await _adminRepository.GetServiceByIdAsync(id);
        if (service == null) return NotFound("Servis nije pronaden.");
        return Ok(service);
    }

    // POST: api/admin/services/{id}/approve
    [HttpPost("services/{id:int}/approve")]
    public async Task<IActionResult> ApproveService(
        int id,
        [FromBody] AdminActionReasonDto? body = null,
        [FromQuery] string? reason = null)
    {
        // Pre-check da izbegnemo duple emailove kod ponovnog klika
        var existing = await _adminRepository.GetServiceByIdAsync(id);
        if (existing == null)
            return NotFound("Servis nije pronađen.");

        if (existing.User?.IsApproved == true)
            return Ok(new { message = "Servis je već odobren.", emailSent = false });

        // prvo DB
        var service = await _adminRepository.ApproveServiceAsync(id);
        if (service == null)
            return NotFound("Servis nije pronađen.");

        var reasonText = PickReason(body, reason);

        var emailBody =
            "Vaš servis nalog je odobren.\n\n" +
            (string.IsNullOrWhiteSpace(reasonText) ? "" : $"Napomena admina: {reasonText}\n\n") +
            "Možete se prijaviti i koristiti ServisPro platformu.";

        var emailSent = await TrySendEmailAsync(service.User?.Email, "ServisPro - nalog odobren", emailBody);

        return Ok(new
        {
            message = "Servis je odobren. IsApproved je postavljen na true, a servis aktiviran (IsActive=true).",
            emailSent
        });
    }

    // POST: api/admin/services/{id}/reject
    [HttpPost("services/{id:int}/reject")]
    public async Task<IActionResult> RejectService(
        int id,
        [FromBody] AdminActionReasonDto? body = null,
        [FromQuery] string? reason = null)
    {
        // 1) Učitaj servis (da uzmemo email i da validiramo stanje)
        var s = await _adminRepository.GetServiceByIdAsync(id);
        if (s == null) return NotFound("Servis nije pronađen.");

        // Reject ima smisla samo za servise na čekanju
        if (s.User?.IsApproved == true)
            return BadRequest("Servis je već odobren i ne može biti odbijen.");

        var reasonText = PickReason(body, reason);
        var emailTo = s.User?.Email;

        // 2) Pokušaj DB akciju (prvo DB, pa email)
        var ok = await _adminRepository.RejectServiceAsync(id);
        if (!ok) return NotFound("Servis nije pronađen.");

        // 3) Email (ne blokira workflow)
        var emailBody =
            "Vaša prijava servisa je odbijena.\n\n" +
            (string.IsNullOrWhiteSpace(reasonText) ? "" : $"Razlog: {reasonText}\n\n") +
            "Ukoliko smatrate da je došlo do greške, kontaktirajte podršku.";

        var emailSent = await TrySendEmailAsync(emailTo, "ServisPro - prijava odbijena", emailBody);

        return Ok(new
        {
            message = "Servis je odbijen i nalog je uklonjen.",
            emailSent
        });
    }

    // POST: api/admin/services/{id}/deactivate  (soft delete)
    [HttpPost("services/{id:int}/deactivate")]
    public async Task<IActionResult> DeactivateService(
        int id,
        [FromBody] AdminActionReasonDto? body = null,
        [FromQuery] string? reason = null)
    {
        var s = await _adminRepository.GetServiceByIdAsync(id);
        if (s == null) return NotFound("Servis nije pronađen.");

        // Idempotency: već neaktivan
        if (s.IsActive == false)
            return Ok(new { message = "Servis je već deaktiviran (IsActive=false).", emailSent = false });

        var reasonText = PickReason(body, reason);
        var emailTo = s.User?.Email;

        // prvo DB
        var ok = await _adminRepository.DeactivateServiceAsync(id);
        if (!ok) return NotFound("Servis nije pronađen.");

        var emailBody =
            "Vaš servis nalog je deaktiviran (privremeno isključen).\n\n" +
            (string.IsNullOrWhiteSpace(reasonText) ? "" : $"Razlog: {reasonText}\n\n") +
            "Ukoliko imate pitanja, kontaktirajte podršku.";

        var emailSent = await TrySendEmailAsync(emailTo, "ServisPro - nalog deaktiviran", emailBody);

        return Ok(new
        {
            message = "Servis je deaktiviran (IsActive=false).",
            emailSent
        });
    }

    // POST: api/admin/services/{id}/activate
    [HttpPost("services/{id:int}/activate")]
    public async Task<IActionResult> ActivateService(
        int id,
        [FromBody] AdminActionReasonDto? body = null,
        [FromQuery] string? reason = null)
    {
        var s = await _adminRepository.GetServiceByIdAsync(id);
        if (s == null) return NotFound("Servis nije pronađen.");

        // Idempotency: već aktivan
        if (s.IsActive == true)
            return Ok(new { message = "Servis je već aktivan (IsActive=true).", emailSent = false });

        var reasonText = PickReason(body, reason);
        var emailTo = s.User?.Email;

        // prvo DB
        var ok = await _adminRepository.ActivateServiceAsync(id);
        if (!ok) return NotFound("Servis nije pronađen.");

        var emailBody =
            "Vaš servis nalog je ponovo aktiviran.\n\n" +
            (string.IsNullOrWhiteSpace(reasonText) ? "" : $"Napomena admina: {reasonText}\n\n") +
            "Servis je ponovo vidljiv klijentima (ukoliko je odobren).";

        var emailSent = await TrySendEmailAsync(emailTo, "ServisPro - nalog aktiviran", emailBody);

        return Ok(new
        {
            message = "Servis je aktiviran (IsActive=true).",
            emailSent
        });
    }

    // ====== KORISNICI ======

    // GET: api/admin/users?role=Client/Service/Admin
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetUsers([FromQuery] UserRole? role)
    {
        var users = await _adminRepository.GetUsersAsync(role);

        var result = users.Select(u => new AdminUserDto
        {
            UserId = u.Id,
            Email = u.Email,
            Role = u.Role,
            IsApproved = u.IsApproved
        });

        return Ok(result);
    }

    // GET: api/admin/users/{id}
    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _adminRepository.GetUserByIdAsync(id);
        if (user == null) return NotFound("Korisnik nije pronaden.");
        return Ok(user);
    }

    // DELETE: api/admin/users/{id}
    // Razlog može i preko query (?reason=...), i preko body { "reason": "..." }.
    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(
        int id,
        [FromBody] AdminActionReasonDto? body = null,
        [FromQuery] string? reason = null)
    {
        var user = await _adminRepository.GetUserByIdAsync(id);
        if (user == null) return NotFound("Korisnik nije pronađen.");

        var reasonText = PickReason(body, reason);
        var emailTo = user.Email;

        // prvo DB
        var ok = await _adminRepository.DeleteUserAsync(id);
        if (!ok) return NotFound("Korisnik nije pronađen.");

        var emailBody =
            "Vaš nalog na ServisPro platformi je uklonjen od strane administratora.\n\n" +
            (string.IsNullOrWhiteSpace(reasonText) ? "" : $"Razlog: {reasonText}\n\n") +
            "Ukoliko smatrate da je došlo do greške, kontaktirajte podršku.";

        var emailSent = await TrySendEmailAsync(emailTo, "ServisPro - nalog uklonjen", emailBody);

        return Ok(new
        {
            message = "Korisnik je obrisan.",
            emailSent
        });
    }

    // ====== SERVICE TYPES ======

    [HttpGet("service-types")]
    public async Task<ActionResult<IEnumerable<ServiceTypeDto>>> GetServiceTypes()
    {
        var types = await _adminRepository.GetServiceTypesAsync();
        var result = types.Select(t => new ServiceTypeDto
        {
            Id = t.Id,
            Name = t.Name
        });

        return Ok(result);
    }

    [HttpPost("service-types")]
    public async Task<ActionResult<ServiceTypeDto>> CreateServiceType([FromBody] CreateServiceTypeDto dto)
    {
        var st = await _adminRepository.CreateServiceTypeAsync(new ServiceType
        {
            Name = dto.Name
        });

        var result = new ServiceTypeDto { Id = st.Id, Name = st.Name };
        return CreatedAtAction(nameof(GetServiceTypes), new { id = st.Id }, result);
    }

    [HttpPut("service-types/{id:int}")]
    public async Task<IActionResult> UpdateServiceType(int id, [FromBody] UpdateServiceTypeDto dto)
    {
        var st = await _adminRepository.UpdateServiceTypeAsync(new ServiceType
        {
            Id = id,
            Name = dto.Name
        });

        if (st == null)
            return NotFound("Tip usluge nije pronaden.");

        return NoContent();
    }

    [HttpDelete("service-types/{id:int}")]
    public async Task<IActionResult> DeleteServiceType(int id)
    {
        var ok = await _adminRepository.DeleteServiceTypeAsync(id);
        if (!ok)
            return NotFound("Tip usluge nije pronaden.");

        return NoContent();
    }

    // ====== CAR BRANDS & MODELS ======

    [HttpGet("car-brands")]
    public async Task<ActionResult<IEnumerable<CarBrandDto>>> GetCarBrands()
    {
        var brands = await _adminRepository.GetCarBrandsAsync();
        var result = brands.Select(b => new CarBrandDto
        {
            Id = b.Id,
            Name = b.Name
        });

        return Ok(result);
    }

    [HttpPost("car-brands")]
    public async Task<ActionResult<CarBrandDto>> CreateCarBrand([FromBody] CreateCarBrandDto dto)
    {
        var brand = await _adminRepository.CreateCarBrandAsync(new CarBrand
        {
            Name = dto.Name
        });

        var result = new CarBrandDto { Id = brand.Id, Name = brand.Name };
        return CreatedAtAction(nameof(GetCarBrands), new { id = brand.Id }, result);
    }

    [HttpPut("car-brands/{id:int}")]
    public async Task<IActionResult> UpdateCarBrand(int id, [FromBody] UpdateCarBrandDto dto)
    {
        var brand = await _adminRepository.UpdateCarBrandAsync(new CarBrand
        {
            Id = id,
            Name = dto.Name
        });

        if (brand == null)
            return NotFound("Marka nije pronadena.");

        return NoContent();
    }

    [HttpDelete("car-brands/{id:int}")]
    public async Task<IActionResult> DeleteCarBrand(int id)
    {
        var ok = await _adminRepository.DeleteCarBrandAsync(id);
        if (!ok)
            return NotFound("Marka nije pronadena.");

        return NoContent();
    }

    [HttpGet("car-brands/{brandId:int}/models")]
    public async Task<ActionResult<IEnumerable<CarModelDto>>> GetModelsByBrand(int brandId)
    {
        var models = await _adminRepository.GetModelsByBrandAsync(brandId);
        var result = models.Select(m => new CarModelDto
        {
            Id = m.Id,
            Name = m.Name,
            CarBrandId = m.CarBrandId
        });

        return Ok(result);
    }

    [HttpPost("car-models")]
    public async Task<ActionResult<CarModelDto>> CreateCarModel([FromBody] CreateCarModelDto dto)
    {
        var model = await _adminRepository.CreateCarModelAsync(new CarModel
        {
            Name = dto.Name,
            CarBrandId = dto.CarBrandId
        });

        var result = new CarModelDto
        {
            Id = model.Id,
            Name = model.Name,
            CarBrandId = model.CarBrandId
        };

        return CreatedAtAction(nameof(GetModelsByBrand), new { brandId = model.CarBrandId }, result);
    }

    [HttpPut("car-models/{id:int}")]
    public async Task<IActionResult> UpdateCarModel(int id, [FromBody] UpdateCarModelDto dto)
    {
        var model = await _adminRepository.UpdateCarModelAsync(new CarModel
        {
            Id = id,
            Name = dto.Name
        });

        if (model == null)
            return NotFound("Model nije pronaden.");

        return NoContent();
    }

    [HttpDelete("car-models/{id:int}")]
    public async Task<IActionResult> DeleteCarModel(int id)
    {
        var ok = await _adminRepository.DeleteCarModelAsync(id);
        if (!ok)
            return NotFound("Model nije pronaden.");

        return NoContent();
    }

    // ====== CARS / APPOINTMENTS / HISTORY ======

    // GET: api/admin/cars?clientId=
    [HttpGet("cars")]
    public async Task<IActionResult> GetCars([FromQuery] int? clientId = null)
    {
        var cars = await _adminRepository.GetCarsAsync(clientId);

        var result = cars.Select(c => new AdminCarListDto
        {
            CarId = c.Id,
            VIN = c.VIN,
            Year = c.Year,
            BrandName = c.CarBrand?.Name ?? "",
            ModelName = c.CarModel?.Name ?? "",
            ClientId = c.ClientId,
            ClientName = c.Client?.FullName ?? "",
            ClientEmail = c.Client?.User?.Email ?? ""
        }).ToList();

        return Ok(result);
    }

    // GET: api/admin/cars/{id}
    [HttpGet("cars/{id:int}")]
    public async Task<IActionResult> GetCarById(int id)
    {
        var car = await _adminRepository.GetCarByIdAsync(id);
        if (car == null) return NotFound("Vozilo nije pronadeno.");
        return Ok(car);
    }

    // Admin brie vozilo (u slucaju nepravilnosti)
    [HttpDelete("cars/{id:int}")]
    public async Task<IActionResult> DeleteCar(int id)
    {
        var ok = await _adminRepository.DeleteCarAsync(id);
        if (!ok)
            return NotFound("Vozilo nije pronadeno.");

        return NoContent();
    }

    // GET: api/admin/appointments?serviceId=&clientId=&status=
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments([FromQuery] int? serviceId = null, [FromQuery] int? clientId = null, [FromQuery] AppointmentStatus? status = null)
    {
        var appts = await _adminRepository.GetAppointmentsAsync(serviceId, clientId, status);

        var result = appts.Select(a => new AdminAppointmentListDto
        {
            AppointmentId = a.Id,
            ServiceId = a.ServiceId,
            ServiceName = a.Service?.Name ?? "",
            ClientId = a.ClientId,
            ClientName = a.Client?.FullName ?? "",
            ClientEmail = a.Client?.User?.Email ?? "",
            AppointmentDate = a.AppointmentDate,
            AppointmentTime = a.AppointmentTime,
            Status = a.Status.ToString(),
            Description = a.Description ?? ""
        }).ToList();

        return Ok(result);
    }

    // GET: api/admin/appointments/{id}
    [HttpGet("appointments/{id:int}")]
    public async Task<IActionResult> GetAppointmentById(int id)
    {
        var appt = await _adminRepository.GetAppointmentByIdAsync(id);
        if (appt == null) return NotFound("Termin nije pronaden.");
        return Ok(appt);
    }

    // Admin brie sporni termin
    [HttpDelete("appointments/{id:int}")]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var ok = await _adminRepository.DeleteAppointmentAsync(id);
        if (!ok)
            return NotFound("Termin nije pronaden.");

        return NoContent();
    }

    // GET: api/admin/car-history?serviceId=&carId=
    [HttpGet("car-history")]
    public async Task<IActionResult> GetCarHistory([FromQuery] int? serviceId = null, [FromQuery] int? carId = null)
    {
        var hist = await _adminRepository.GetCarHistoriesAsync(serviceId, carId);

        var result = hist.Select(h => new AdminCarHistoryListDto
        {
            CarHistoryId = h.Id,
            CarId = h.CarId,
            CarLabel =
                $"{h.Car?.CarBrand?.Name ?? ""} {h.Car?.CarModel?.Name ?? ""} (VIN: {h.Car?.VIN ?? ""})".Trim(),
            ClientName = h.Car?.Client?.FullName ?? "",
            ClientEmail = h.Car?.Client?.User?.Email ?? "",
            ServiceId = h.ServiceId,
            ServiceName = h.Service?.Name ?? "",
            ServiceDate = h.ServiceDate,
            Mileage = h.Mileage,
            Title = h.Title ?? "",
            Description = h.Description ?? ""
        }).ToList();

        return Ok(result);
    }

    // GET: api/admin/car-history/{id}
    [HttpGet("car-history/{id:int}")]
    public async Task<IActionResult> GetCarHistoryById(int id)
    {
        var history = await _adminRepository.GetCarHistoryByIdAsync(id);
        if (history == null) return NotFound("Zapis o intervenciji nije pronaden.");
        return Ok(history);
    }

    // Admin brie spornu intervenciju
    [HttpDelete("car-history/{id:int}")]
    public async Task<IActionResult> DeleteCarHistory(int id)
    {
        var ok = await _adminRepository.DeleteCarHistoryAsync(id);
        if (!ok)
            return NotFound("Zapis o intervenciji nije pronaden.");

        return NoContent();
    }

    // ====== REVIEWS ======

    [HttpGet("services/{serviceId:int}/reviews")]
    public async Task<ActionResult<IEnumerable<ReviewAdminDto>>> GetReviewsForService(int serviceId)
    {
        var reviews = await _adminRepository.GetReviewsForServiceAsync(serviceId);

        var result = reviews.Select(r => new ReviewAdminDto
        {
            Id = r.Id,
            Rating = r.Rating,
            Comment = r.Comment,
            ReviewDate = r.ReviewDate,
            ClientId = r.ClientId,
            ServiceId = r.ServiceId
        });

        return Ok(result);
    }

    // GET: api/admin/reviews?serviceId=&clientId=
    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews([FromQuery] int? serviceId = null, [FromQuery] int? clientId = null)
    {
        var reviews = await _adminRepository.GetAllReviewsAsync(serviceId, clientId);

        var result = reviews.Select(r => new AdminReviewListDto
        {
            ReviewId = r.Id,
            ServiceId = r.ServiceId,
            ServiceName = r.Service?.Name ?? "",
            ClientId = r.ClientId,
            ClientName = r.Client?.FullName ?? "",
            ClientEmail = r.Client?.User?.Email ?? "",
            Rating = r.Rating,
            Comment = r.Comment ?? "",
            ReviewDate = r.ReviewDate
        }).ToList();

        return Ok(result);
    }

    // GET: api/admin/reviews/{id}
    [HttpGet("reviews/{id:int}")]
    public async Task<IActionResult> GetReviewById(int id)
    {
        var review = await _adminRepository.GetReviewByIdAsync(id);
        if (review == null) return NotFound("Recenzija nije pronadena.");
        return Ok(review);
    }

    [HttpDelete("reviews/{id:int}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var ok = await _adminRepository.DeleteReviewAsync(id);
        if (!ok)
            return NotFound("Recenzija nije pronadena.");

        return NoContent();
    }
}