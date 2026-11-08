using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface ICarRepository
    {
        Task<bool> CarVinExistsAsync(string vin);

        Task<Car?> AddCarForUserAsync(
            int userId,
            string vin,
            int? year,
            int carBrandId,
            int carModelId);

        Task<List<Car>> GetCarsForUserAsync(int userId, string? vinSearch);

        Task<Car?> GetCarWithHistoryForUserAsync(int carId, int userId);

        Task<bool> DeleteCarForUserAsync(int carId, int userId);

        Task<List<CarHistory>> GetMileageHistoryForUserAsync(int carId, int userId);
        Task<Car?> GetCarWithHistoryByVinAsync(string vin);
        Task<Car?> GetCarByVINWithMileageHistoryAsync(string vin);
        Task<List<Appointment>> GetCarsInServiceAsync(int serviceId);
        Task<Service?> GetServiceByUserIdAsync(int userId);


    }
}
