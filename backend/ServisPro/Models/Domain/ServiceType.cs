namespace ServisPro.Models.Domain
{
    public class ServiceType
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        public ICollection<ServiceServiceType> ServiceServiceTypes { get; set; } = new List<ServiceServiceType>();
    }
}
