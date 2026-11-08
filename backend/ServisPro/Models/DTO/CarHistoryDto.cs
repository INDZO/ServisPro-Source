namespace ServisPro.Models.DTO
{
    public class CarHistoryDto
    {
        public int Id { get; set; }
        public int CarId { get; set; }
        public string CarVin { get; set; } = string.Empty;
        public string CarBrand { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;

        public int AppointmentId { get; set; }

        public int ServiceTypeId { get; set; }
        public string ServiceTypeName { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public int Mileage { get; set; }
        public DateTime ServiceDate { get; set; }
        public bool CanUpdate { get; set; }

    }
    public class CarHistoryUpdateRequest
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public int Mileage { get; set; }
    }


}
