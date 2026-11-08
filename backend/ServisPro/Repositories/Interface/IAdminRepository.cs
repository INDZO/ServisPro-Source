using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IAdminRepository
    {
        // SERVICES
        Task<List<Service>> GetPendingServicesAsync();
        Task<Service?> ApproveServiceAsync(int serviceId);
        Task<bool> RejectServiceAsync(int serviceId);
        Task<bool> ActivateServiceAsync(int serviceId);
        Task<bool> DeactivateServiceAsync(int serviceId);
        Task<Service?> GetServiceByIdAsync(int serviceId);
        Task<List<Service>> GetServicesAsync(bool? isActive, bool? isApproved);


        // USERS
        Task<List<User>> GetUsersAsync(UserRole? role = null);
        Task<User?> GetUserByIdAsync(int userId);
        Task<bool> DeleteUserAsync(int userId);

        // SERVICE TYPES
        Task<List<ServiceType>> GetServiceTypesAsync();
        Task<ServiceType> CreateServiceTypeAsync(ServiceType type);
        Task<ServiceType?> UpdateServiceTypeAsync(ServiceType type);
        Task<bool> DeleteServiceTypeAsync(int id);

        // CAR BRANDS
        Task<List<CarBrand>> GetCarBrandsAsync();
        Task<CarBrand> CreateCarBrandAsync(CarBrand brand);
        Task<CarBrand?> UpdateCarBrandAsync(CarBrand brand);
        Task<bool> DeleteCarBrandAsync(int id);

        // CAR MODELS
        Task<List<CarModel>> GetModelsByBrandAsync(int brandId);
        Task<CarModel> CreateCarModelAsync(CarModel model);
        Task<CarModel?> UpdateCarModelAsync(CarModel model);
        Task<bool> DeleteCarModelAsync(int id);

        // CARS
        Task<List<Car>> GetCarsAsync(int? clientId = null);
        Task<Car?> GetCarByIdAsync(int id);
        Task<bool> DeleteCarAsync(int id);

        // APPOINTMENTS
        Task<List<Appointment>> GetAppointmentsAsync(
            int? serviceId = null,
            int? clientId = null,
            AppointmentStatus? status = null);

        Task<Appointment?> GetAppointmentByIdAsync(int id);
        Task<bool> DeleteAppointmentAsync(int id);

        // CAR HISTORY
        Task<List<CarHistory>> GetCarHistoriesAsync(
            int? serviceId = null,
            int? carId = null);

        Task<CarHistory?> GetCarHistoryByIdAsync(int id);
        Task<bool> DeleteCarHistoryAsync(int id);

        // REVIEWS
        Task<List<Review>> GetReviewsForServiceAsync(int serviceId);
        Task<List<Review>> GetAllReviewsAsync(int? serviceId = null, int? clientId = null);
        Task<Review?> GetReviewByIdAsync(int id);
        Task<bool> DeleteReviewAsync(int id);
    }
}
