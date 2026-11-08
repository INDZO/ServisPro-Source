using ServisPro.Models.Domain;

namespace ServisPro.Repositories.Interface
{
    public interface IClosedDaysRepository
    {
        Task<ClosedDays?> GetByIdAsync(int id);
        Task<ClosedDays?> GetByDateAsync(DateTime date, int serviceId);
        Task<ClosedDays> CreateAsync(ClosedDays closedDay);
        Task<bool> DeleteAsync(int id);

        Task<List<Appointment>> GetAppointmentsForDateAsync(DateTime date, int serviceId);
        Task UpdateAppointmentAsync(Appointment appointment);
        Task<Appointment?> GetByIdAppAsync(int id);

        Task<Service?> GetServiceByIdAsync(int serviceId);
        Task<List<DateTime>> GetClosedDaysAsync(int serviceId, DateTime start, DateTime end);
        Task<List<Appointment>> GetAppointmentsForServiceAsync(int serviceId, DateTime start, DateTime end);
    }
}
