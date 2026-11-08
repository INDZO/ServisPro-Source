using System.ComponentModel.DataAnnotations;

namespace ServisPro.Models.DTO
{
    public class ServiceDailyAppointmentDto
    {
        public int Id { get; set; }
        public DateTime AppointmentDate { get; set; }
        public TimeSpan? AppointmentTime { get; set; }
        public string Status { get; set; } = string.Empty;

        public int ClientId { get; set; }
        public string ClientFullName { get; set; } = string.Empty;
        public string ClientEmail { get; set; } = string.Empty;

        public int CarId { get; set; }
        public string CarVin { get; set; } = string.Empty;
        public string CarBrand { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;

        public int ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
    }
    public class RejectAppointmentRequest
    {
        public string Reason { get; set; } = string.Empty;
    }
    public class CompleteAppointmentDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Mileage { get; set; }
    }
    public class CalendarAppointmentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime Start { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
    public class CalendarDayDto
    {
        public string Date { get; set; } = string.Empty; // "yyyy-MM-dd"
        public List<CalendarAppointmentDto> Appointments { get; set; } = new();
    }
    public class CalendarResponseDto
    {
        public List<string> WorkingDays { get; set; } = new(); // ["Mon","Tue",...]
        public List<string> ClosedDays { get; set; } = new(); // ["2025-11-01", ...]
        public List<CalendarDayDto> Days { get; set; } = new();
    }
}
