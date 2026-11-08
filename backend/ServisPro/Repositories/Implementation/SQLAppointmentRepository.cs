using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLAppointmentRepository : IAppointmentRepository
    {
        private readonly ServisProDbContext _context;

        public SQLAppointmentRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<Appointment?> CreateForClientAsync(
            int userId,
            int serviceId,
            int carId,
            int serviceTypeId,
            DateTime appointmentDate,
            TimeSpan? appointmentTime,
            string? description)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.UserId == userId);
            if (client == null)
                return null;

            var car = await _context.Cars
                .FirstOrDefaultAsync(c => c.Id == carId && c.ClientId == client.Id);

            if (car == null)
                return null;

            var serviceExists = await _context.Services
                .AnyAsync(s => s.Id == serviceId && s.IsActive && s.User.IsApproved);

            if (!serviceExists)
                return null;

            var serviceTypeExists = await _context.ServiceTypes
                .AnyAsync(st => st.Id == serviceTypeId);

            if (!serviceTypeExists)
                return null;

            var appointment = new Appointment
            {
                Description = description ?? string.Empty,
                AppointmentDate = appointmentDate.Date,
                AppointmentTime = appointmentTime,
                Status = AppointmentStatus.Requested,
                ClientId = client.Id,
                ServiceId = serviceId,
                CarId = car.Id,
                ServiceTypeId = serviceTypeId
            };

            await _context.Appointments.AddAsync(appointment);
            await _context.SaveChangesAsync();

            // Učitavanje navigacija
            await _context.Entry(appointment).Reference(a => a.Service).LoadAsync();
            await _context.Entry(appointment).Reference(a => a.Car).LoadAsync();
            await _context.Entry(appointment).Reference(a => a.ServiceType).LoadAsync();
            await _context.Entry(appointment.Car!).Reference(c => c.CarBrand).LoadAsync();
            await _context.Entry(appointment.Car!).Reference(c => c.CarModel).LoadAsync();

            return appointment;
        }

        public async Task<List<Appointment>> GetForClientAsync(
            int userId,
            AppointmentStatus? statusFilter)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.UserId == userId);
            if (client == null)
                return new List<Appointment>();

            var query = _context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Car).ThenInclude(c => c.CarBrand)
                .Include(a => a.Car).ThenInclude(c => c.CarModel)
                .Include(a => a.ServiceType)
                .Where(a => a.ClientId == client.Id)
                .AsQueryable();

            if (statusFilter.HasValue)
                query = query.Where(a => a.Status == statusFilter.Value);

            query = query
                .OrderByDescending(a => a.AppointmentDate)
                .ThenByDescending(a => a.AppointmentTime);

            return await query.ToListAsync();
        }

        public async Task<Appointment?> GetByIdForClientAsync(int appointmentId, int userId)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.UserId == userId);
            if (client == null)
                return null;

            return await _context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Car).ThenInclude(c => c.CarBrand)
                .Include(a => a.Car).ThenInclude(c => c.CarModel)
                .Include(a => a.ServiceType)
                .FirstOrDefaultAsync(a => a.Id == appointmentId && a.ClientId == client.Id);
        }

        public async Task<bool> CancelAsync(int appointmentId, int userId)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.UserId == userId);
            if (client == null)
                return false;

            var appointment = await _context.Appointments
                .FirstOrDefaultAsync(a => a.Id == appointmentId && a.ClientId == client.Id);

            if (appointment == null)
                return false;

            if (appointment.Status == AppointmentStatus.InService ||
                appointment.Status == AppointmentStatus.InProgress ||
                appointment.Status == AppointmentStatus.Completed ||
                appointment.Status == AppointmentStatus.Rejected ||
                appointment.Status == AppointmentStatus.Canceled)
            {
                return false;
            }

            appointment.Status = AppointmentStatus.Canceled;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<string?> GetServiceEmailAsync(int id, int userId)
        {
            var serviceEmail = await _context.Appointments
                .Where(a => a.Id == id && a.Client.UserId == userId)
                .Select(a => a.Service.User.Email)
                .FirstOrDefaultAsync();

            return serviceEmail;
        }

        public async Task<Service?> GetServiceByIdAsync(int serviceId)
        {
            return await _context.Services
                .Include(s => s.ClosedDays)
                .FirstOrDefaultAsync(s => s.Id == serviceId);
        }

        public async Task<List<ClosedDays>> GetClosedDaysAsync(int serviceId)
        {
            return await _context.ClosedDays
                .Where(cd => cd.ServiceId == serviceId)
                .ToListAsync();
        }

        public async Task<List<Appointment>> GetAppointmentsForRangeAsync(
            int serviceId, DateTime from, DateTime to)
        {
            return await _context.Appointments
                .Where(a =>
                    a.ServiceId == serviceId &&
                    a.AppointmentDate >= from &&
                    a.AppointmentDate <= to &&
                    a.Status != AppointmentStatus.Canceled &&
                    a.Status != AppointmentStatus.Rejected
                )
                .ToListAsync();
        }

        public async Task<List<CarHistory>> GetForServiceAsync(int serviceId)
        {
            return await _context.CarHistories
                .Where(ch => ch.ServiceId == serviceId)
                .Include(ch => ch.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(ch => ch.Car)
                    .ThenInclude(c => c.CarModel)
                .Include(ch => ch.ServiceType)
                .OrderByDescending(ch => ch.ServiceDate)  
                .ToListAsync();
        }

        public async Task<CarHistory?> GetCarHistoryByIdAsync(int id)
        {
            return await _context.CarHistories
                .Include(ch => ch.Car)
                .Include(ch => ch.ServiceType)
                .FirstOrDefaultAsync(ch => ch.Id == id);
        }

        public async Task UpdateCarHistoryAsync(CarHistory history)
        {
            _context.CarHistories.Update(history);
            await _context.SaveChangesAsync();
        }

    }
}
