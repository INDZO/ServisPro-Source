namespace ServisPro.Models.Domain
{
    public class ClosedDays
    {
        public int Id { get; set; }

        public DateTime Date { get; set; }
        public string? Reason { get; set; } = string.Empty;

        public int ServiceId { get; set; }
        public Service Service { get; set; } = null!;
    }
}
