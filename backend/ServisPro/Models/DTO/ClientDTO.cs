namespace ServisPro.Models.DTO
{
    // PROFIL
    public class ClientProfileDto
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }

    public class UpdateClientProfileRequest
    {
        public string FullName { get; set; } = string.Empty;
    }
    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    // TERMINI
    public class AppointmentListItemDto
    {
        public int Id { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan? AppointmentTime { get; set; }
        public string Status { get; set; } = string.Empty;

        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;

        public int CarId { get; set; }
        public string CarVin { get; set; } = string.Empty;
        public string CarBrand { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;

        public int ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; } = string.Empty;
    }

    public class CreateAppointmentRequest
    {
        public int ServiceId { get; set; }
        public int CarId { get; set; }
        public int ServiceTypeId { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan? AppointmentTime { get; set; }
        public string? Description { get; set; }
    }

    public class CancelAppointmentRequest
    {
        public string? Reason { get; set; }
    }
    public class UnavailableDayDto
    {
        public DateTime Date { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ServiceCalendarDto
    {
        public int ServiceId { get; set; }
        public DateTime From { get; set; }
        public DateTime To { get; set; }

        public List<string> WorkingDays { get; set; } = new();

        public List<UnavailableDayDto> UnavailableDays { get; set; } = new();
    }

}
