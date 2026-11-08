namespace ServisPro.Models.Domain
{
    public class Review
    {
        public int Id { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime ReviewDate { get; set; } = DateTime.UtcNow;

        public int ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public int ServiceId { get; set; }
        public Service Service { get; set; } = null!;

    }
}
