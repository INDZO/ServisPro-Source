using ServisPro.Models.Domain;

namespace ServisPro.Models.DTO
{
    public class CarDTO
    {
        public class CarCreateDto
        {
            public string VIN { get; set; } = null!;
            public int? Year { get; set; }
            public int CarBrandId { get; set; }
            public int CarModelId { get; set; }
        }

        public class CarListItemDto
        {
            public int Id { get; set; }
            public string VIN { get; set; } = null!;
            public int? Year { get; set; }
            public string BrandName { get; set; } = null!;
            public string ModelName { get; set; } = null!;
        }

        public class CarHistoryItemDto
        {
            public int Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public int Mileage { get; set; }
            public DateTime ServiceDate { get; set; }

            public string ServiceName { get; set; } = string.Empty;
            public string ServiceTypeName { get; set; } = string.Empty;
        }

        public class CarDetailsDto
        {
            public int Id { get; set; }
            public string VIN { get; set; } = null!;
            public int? Year { get; set; }
            public string BrandName { get; set; } = null!;
            public string ModelName { get; set; } = null!;
            public List<CarHistoryItemDto> History { get; set; } = new();
        }

        public class MileagePointDto
        {
            public DateTime ServiceDate { get; set; }
            public int Mileage { get; set; }
        }
        public class CarInServiceDto
        {
            public int CarId { get; set; }
            public string VIN { get; set; } = null!;
            public string Brand { get; set; } = null!;
            public string Model { get; set; } = null!;
            public AppointmentStatus Status { get; set; }
            public DateTime AppointmentDate { get; set; }
            public int? Year { get; set; }
        }

    }
}
