using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IAppointmentRepository
    {
            Task<Appointment?> CreateForClientAsync(
                int userId,
                int serviceId,
                int carId,
                int serviceTypeId,
                DateTime appointmentDate,
                TimeSpan? appointmentTime,
                string? description);

            Task<List<Appointment>> GetForClientAsync(
                int userId,
                AppointmentStatus? statusFilter);

            Task<Appointment?> GetByIdForClientAsync(int appointmentId, int userId);

            Task<bool> CancelAsync(int appointmentId, int userId);
            Task<string?> GetServiceEmailAsync(int id, int userId);

        Task<Service?> GetServiceByIdAsync(int serviceId);
        Task<List<ClosedDays>> GetClosedDaysAsync(int serviceId);
        Task<List<Appointment>> GetAppointmentsForRangeAsync(int serviceId, DateTime from, DateTime to);


        Task<List<CarHistory>> GetForServiceAsync(int serviceId);
        Task<CarHistory?> GetCarHistoryByIdAsync(int id);
        Task UpdateCarHistoryAsync(CarHistory history);


    }
}
