namespace ServisPro.Models.Domain
{
    public enum AppointmentStatus
    {
        Requested = 0,
        Accepted = 1,
        InService = 2,
        InProgress = 3,
        Completed = 4,
        Canceled = 5,
        Rejected = 6
    }
    public class Appointment
    {
        public int Id { get; set; }
        public string? Description { get; set; } = string.Empty;
        public DateTime AppointmentDate { get; set; }
        public TimeSpan? AppointmentTime { get; set; }
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Requested;

        public int ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public int ServiceId { get; set; }
        public Service Service { get; set; } = null!;

        public int CarId { get; set; }
        public Car Car { get; set; } = null!;

        public int ServiceTypeId { get; set; }
        public ServiceType ServiceType { get; set; } = null!;

        public CarHistory? CarHistory { get; set; }
    }
}
