namespace ServisPro.Models.Domain
{
    public class ServiceServiceType
    {
        public int ServiceId { get; set; }
        public Service Service { get; set; } = null!;
        public int ServiceTypeId { get; set; }
        public ServiceType ServiceType { get; set; } = null!;
    }
}