using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IServiceAppointment
    {
        Task<List<Appointment>> GetAppointmentsForServiceAsync(int serviceId, AppointmentStatus? status = null, DateTime? date = null);
        Task<Appointment?> GetAppointmentByIdForServiceAsync(int appointmentId, int serviceId);
        Task UpdateAppointmentAsync(Appointment appointment);
        Task<Appointment?> GetByIdAsync(int id);
        Task AddHistoryAsync(CarHistory history);
    }
}
