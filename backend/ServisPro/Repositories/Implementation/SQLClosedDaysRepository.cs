using Microsoft.EntityFrameworkCore;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;
using ServisPro.Services;
using ServisPro.Data;

namespace ServisPro.Repositories.Implementation
{
    public class SQLClosedDaysRepository : IClosedDaysRepository
    {
        private readonly ServisProDbContext _context;
        
        public SQLClosedDaysRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<ClosedDays?> GetByIdAsync(int id)
        {
            return await _context.ClosedDays.FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<ClosedDays?> GetByDateAsync(DateTime date, int serviceId)
        {
            return await _context.ClosedDays
                .FirstOrDefaultAsync(x => x.Date.Date == date.Date && x.ServiceId == serviceId);
        }

        public async Task<ClosedDays> CreateAsync(ClosedDays closedDay)
        {
            await _context.ClosedDays.AddAsync(closedDay);
            await _context.SaveChangesAsync();
            return closedDay;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.ClosedDays.FindAsync(id);
            if (entity == null) return false;

            _context.ClosedDays.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<Appointment>> GetAppointmentsForDateAsync(DateTime date, int serviceId)
        {
            return await _context.Appointments
                .Include(a => a.Client).ThenInclude(c => c.User)
                .Include(a => a.Service)
                .Include(a => a.Car)
                .Where(a => a.AppointmentDate.Date == date.Date &&
                            a.ServiceId == serviceId)
                .ToListAsync();
        }

        public async Task UpdateAppointmentAsync(Appointment appointment)
        {
            _context.Appointments.Update(appointment);
            await _context.SaveChangesAsync();
        }
        public async Task<Appointment?> GetByIdAppAsync(int id)
        {
            return await _context.Appointments
                .Include(x => x.Client).ThenInclude(c => c.User)
                .Include(x => x.Service)
                .Include(x => x.Car)
                .FirstOrDefaultAsync(x => x.Id == id);
        }
        public async Task<Service?> GetServiceByIdAsync(int serviceId)
        {
            return await _context.Services
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == serviceId);
        }

        public async Task<List<DateTime>> GetClosedDaysAsync(int serviceId, DateTime start, DateTime end)
        {
            return await _context.ClosedDays
                .AsNoTracking()
                .Where(cd => cd.ServiceId == serviceId && cd.Date >= start && cd.Date < end)
                .Select(cd => cd.Date.Date)
                .ToListAsync();
        }

        public async Task<List<Appointment>> GetAppointmentsForServiceAsync(int serviceId, DateTime start, DateTime end)
        {
            return await _context.Appointments
                .AsNoTracking()
                .Include(a => a.Service)
                .Include(a => a.Car)
                .Include(a => a.Client).ThenInclude(c => c.User)
                .Where(a => a.ServiceId == serviceId && a.AppointmentDate >= start && a.AppointmentDate < end)
                .ToListAsync();
        }
    }
}
