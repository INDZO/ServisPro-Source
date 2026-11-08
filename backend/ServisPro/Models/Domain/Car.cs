namespace ServisPro.Models.Domain
{
    public class Car
    {
        public int Id { get; set; }
        public string VIN { get; set; } = null!;
        public int? Year { get; set; }

        public int ClientId { get; set; }
        public Client Client { get; set; } = null!;


        public int CarBrandId { get; set; }
        public CarBrand CarBrand { get; set; } = null!;

        public int CarModelId { get; set; } 
        public CarModel CarModel { get; set; } = null!;

        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public ICollection<CarHistory> CarHistories { get; set; } = new List<CarHistory>();
    }
}
