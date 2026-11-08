using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLServiceAppointment : IServiceAppointment
    {
        private readonly ServisProDbContext _context;

        public SQLServiceAppointment(ServisProDbContext db)
        {
            _context = db;
        }

        public async Task<List<Appointment>> GetAppointmentsForServiceAsync(int serviceId, AppointmentStatus? status = null, DateTime? date = null)
        {
            var query = _context.Appointments
                .Include(a => a.Client).ThenInclude(c => c.User)
                .Include(a => a.Car).ThenInclude(c => c.CarBrand)
                .Include(a => a.Car).ThenInclude(c => c.CarModel)
                .Include(a => a.ServiceType)
                .Where(a => a.ServiceId == serviceId)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            if (date.HasValue)
                query = query.Where(a => a.AppointmentDate.Date == date.Value.Date);

            return await query
                .OrderByDescending(a => a.AppointmentDate)
                .ThenByDescending(a => a.Id)
                .ToListAsync();
        }

        public async Task<Appointment?> GetAppointmentByIdForServiceAsync(int appointmentId, int serviceId)
        {
            return await _context.Appointments
                .Include(a => a.Client).ThenInclude(c => c.User)
                .Include(a => a.Car).ThenInclude(c => c.CarBrand)
                .Include(a => a.Car).ThenInclude(c => c.CarModel)
                .Include(a => a.ServiceType)
                .FirstOrDefaultAsync(a => a.Id == appointmentId && a.ServiceId == serviceId);
        }

        public async Task<Appointment?> GetByIdAsync(int id)
        {
            return await _context.Appointments
                .Include(a => a.Client).ThenInclude(c => c.User)
                .Include(a => a.Car)
                .Include(a => a.ServiceType)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task UpdateAppointmentAsync(Appointment appointment)
        {
            _context.Appointments.Update(appointment);
            await _context.SaveChangesAsync();
        }

        public async Task AddHistoryAsync(CarHistory history)
        {
            await _context.CarHistories.AddAsync(history);
            await _context.SaveChangesAsync();
        }
    }
}
