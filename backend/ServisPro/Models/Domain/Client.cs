namespace ServisPro.Models.Domain
{
    public class Client
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public string FullName { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public string? ImagePublicId { get; set; }

        public ICollection<Car> Cars { get; set; } = new List<Car>();
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();
    }
}
