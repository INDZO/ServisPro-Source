namespace ServisPro.Models.Domain
{
    public class Service
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public string Name { get; set; } = null!;
        public string PIB { get; set; } = null!;
        public string Description { get; set; } = string.Empty;

        public string Adress {  get; set; } = null!;
        public string City { get; set; } = null!;
        public string WorkingHours { get; set; } = string.Empty;
        public string WorkingDays { get; set; } = string.Empty;

        public string OwnerFullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }
        public string? ImagePublicId { get; set; }
        public string? GoogleMapsLink { get; set; }

        public bool IsActive { get; set;  } = true;

        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public ICollection<CarHistory> CarHistories { get; set; } = new List<CarHistory>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();
        public ICollection<ServiceServiceType> ServiceServiceTypes { get; set; } = new List<ServiceServiceType>();
        public ICollection<ClosedDays> ClosedDays { get; set; } = new List<ClosedDays>();

    }
}
