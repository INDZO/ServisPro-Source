using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLAdminRepository : IAdminRepository
    {
        private readonly ServisProDbContext _context;

        public SQLAdminRepository(ServisProDbContext context)
        {
            _context = context;
        }

        // ===================== SERVICES =====================

        public async Task<List<Service>> GetPendingServicesAsync()
        {
            return await _context.Services
                .Include(s => s.User)
                .Where(s => s.User.Role == UserRole.Service && !s.User.IsApproved)
                .ToListAsync();
        }

        public async Task<Service?> ApproveServiceAsync(int serviceId)
        {
            var service = await _context.Services
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == serviceId);

            if (service == null) return null;

            service.User.IsApproved = true;
            service.IsActive = true;

            await _context.SaveChangesAsync();
            return service;
        }

        public async Task<bool> RejectServiceAsync(int serviceId)
        {
            var service = await _context.Services
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == serviceId);

            if (service == null) return false;

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                await DeleteServiceGraphAsync(serviceId);

                // posle brisanja servisa, brišemo i user nalog servisa
                _context.Users.Remove(service.User);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ActivateServiceAsync(int serviceId)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service == null) return false;

            service.IsActive = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeactivateServiceAsync(int serviceId)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service == null) return false;

            service.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Service?> GetServiceByIdAsync(int serviceId)
        {
            return await _context.Services
                .Include(s => s.User)
                .Include(s => s.ServiceServiceTypes)
                    .ThenInclude(x => x.ServiceType)
                .FirstOrDefaultAsync(s => s.Id == serviceId);
        }

        public async Task<List<Service>> GetServicesAsync(bool? isActive, bool? isApproved)
        {
            var query = _context.Services
                .Include(s => s.User)
                .AsQueryable();

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            if (isApproved.HasValue)
                query = query.Where(s => s.User.IsApproved == isApproved.Value);

            return await query.ToListAsync();
        }

        // ===================== USERS =====================

        public async Task<List<User>> GetUsersAsync(UserRole? role = null)
        {
            var query = _context.Users.AsQueryable();
            if (role.HasValue)
                query = query.Where(u => u.Role == role.Value);

            return await query.ToListAsync();
        }

        public async Task<User?> GetUserByIdAsync(int userId)
        {
            return await _context.Users
                .Include(u => u.Client)
                .Include(u => u.Service)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.Client)
                .Include(u => u.Service)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return false;

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // 0) Uvek prvo obriši poruke gde je user sender (FK ChatMessages -> Users)
                var senderMsgs = await _context.ChatMessages
                    .Where(m => m.SenderId == user.Id)
                    .ToListAsync();
                if (senderMsgs.Count > 0)
                    _context.ChatMessages.RemoveRange(senderMsgs);

                if (user.Role == UserRole.Service)
                {
                    var serviceId = user.Service?.Id
                        ?? await _context.Services
                            .Where(s => s.UserId == user.Id)
                            .Select(s => s.Id)
                            .FirstOrDefaultAsync();

                    if (serviceId > 0)
                        await DeleteServiceGraphAsync(serviceId);
                }
                else if (user.Role == UserRole.Client)
                {
                    var clientId = user.Client?.Id
                        ?? await _context.Clients
                            .Where(c => c.UserId == user.Id)
                            .Select(c => c.Id)
                            .FirstOrDefaultAsync();

                    if (clientId > 0)
                        await DeleteClientGraphAsync(clientId);
                }

                _context.Users.Remove(user);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // ===================== SERVICE TYPES =====================

        public async Task<List<ServiceType>> GetServiceTypesAsync()
        {
            return await _context.ServiceTypes
                .OrderBy(st => st.Name)
                .ToListAsync();
        }

        public async Task<ServiceType> CreateServiceTypeAsync(ServiceType serviceType)
        {
            _context.ServiceTypes.Add(serviceType);
            await _context.SaveChangesAsync();
            return serviceType;
        }

        public async Task<ServiceType?> UpdateServiceTypeAsync(ServiceType serviceType)
        {
            var existing = await _context.ServiceTypes.FindAsync(serviceType.Id);
            if (existing == null) return null;

            existing.Name = serviceType.Name;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteServiceTypeAsync(int id)
        {
            var st = await _context.ServiceTypes.FindAsync(id);
            if (st == null) return false;

            _context.ServiceTypes.Remove(st);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== CAR BRANDS =====================

        public async Task<List<CarBrand>> GetCarBrandsAsync()
        {
            return await _context.CarBrands
                .OrderBy(cb => cb.Name)
                .ToListAsync();
        }

        public async Task<CarBrand> CreateCarBrandAsync(CarBrand brand)
        {
            _context.CarBrands.Add(brand);
            await _context.SaveChangesAsync();
            return brand;
        }

        public async Task<CarBrand?> UpdateCarBrandAsync(CarBrand brand)
        {
            var existing = await _context.CarBrands.FindAsync(brand.Id);
            if (existing == null) return null;

            existing.Name = brand.Name;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteCarBrandAsync(int id)
        {
            var brand = await _context.CarBrands.FindAsync(id);
            if (brand == null) return false;

            _context.CarBrands.Remove(brand);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== CAR MODELS =====================

        public async Task<List<CarModel>> GetModelsByBrandAsync(int brandId)
        {
            return await _context.CarModels
                .Where(cm => cm.CarBrandId == brandId)
                .OrderBy(cm => cm.Name)
                .ToListAsync();
        }

        public async Task<CarModel> CreateCarModelAsync(CarModel model)
        {
            _context.CarModels.Add(model);
            await _context.SaveChangesAsync();
            return model;
        }

        public async Task<CarModel?> UpdateCarModelAsync(CarModel model)
        {
            var existing = await _context.CarModels.FindAsync(model.Id);
            if (existing == null) return null;

            existing.Name = model.Name;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteCarModelAsync(int id)
        {
            var model = await _context.CarModels.FindAsync(id);
            if (model == null) return false;

            _context.CarModels.Remove(model);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== CARS =====================

        public async Task<List<Car>> GetCarsAsync(int? clientId = null)
        {
            var query = _context.Cars
                .Include(c => c.CarBrand)
                .Include(c => c.CarModel)
                .Include(c => c.Client)
                    .ThenInclude(cl => cl.User)
                .AsQueryable();

            if (clientId.HasValue)
                query = query.Where(c => c.ClientId == clientId.Value);

            return await query.ToListAsync();
        }

        public async Task<Car?> GetCarByIdAsync(int id)
        {
            return await _context.Cars
                .Include(c => c.CarBrand)
                .Include(c => c.CarModel)
                .Include(c => c.Client)
                    .ThenInclude(cl => cl.User)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<bool> DeleteCarAsync(int id)
        {
            var car = await _context.Cars.FindAsync(id);
            if (car == null) return false;

            // CarHistories vezane za auto
            var histories = await _context.CarHistories
                .Where(h => h.CarId == id)
                .ToListAsync();
            if (histories.Count > 0)
                _context.CarHistories.RemoveRange(histories);

            // Appointments vezani za auto
            var appts = await _context.Appointments
                .Where(a => a.CarId == id)
                .ToListAsync();
            if (appts.Count > 0)
                _context.Appointments.RemoveRange(appts);

            _context.Cars.Remove(car);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== APPOINTMENTS =====================

        public async Task<List<Appointment>> GetAppointmentsAsync(int? serviceId = null, int? clientId = null, AppointmentStatus? status = null)
        {
            var query = _context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                    .ThenInclude(c => c.User)
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarModel)
                .AsQueryable();

            if (serviceId.HasValue)
                query = query.Where(a => a.ServiceId == serviceId.Value);

            if (clientId.HasValue)
                query = query.Where(a => a.ClientId == clientId.Value);

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            return await query.ToListAsync();
        }

        public async Task<Appointment?> GetAppointmentByIdAsync(int id)
        {
            return await _context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                    .ThenInclude(c => c.User)
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarModel)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<bool> DeleteAppointmentAsync(int id)
        {
            var appt = await _context.Appointments.FindAsync(id);
            if (appt == null) return false;

            // sigurnosno: obriši car history vezan za ovaj termin (ako postoji veza preko AppointmentId u bazi)
            // Ako u tvojoj šemi CarHistory nema AppointmentId, ovaj blok ne šteti jer neće naći ništa ako kolona ne postoji u modelu.
            // (Ako ima, EF će znati; ako nema, ukloni ovaj blok.)
            var histories = await _context.CarHistories
                .Where(h => h.AppointmentId == id)
                .ToListAsync();
            if (histories.Count > 0)
                _context.CarHistories.RemoveRange(histories);

            _context.Appointments.Remove(appt);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== CAR HISTORY =====================

        public async Task<List<CarHistory>> GetCarHistoriesAsync(int? serviceId = null, int? carId = null)
        {
            var query = _context.CarHistories
                .Include(h => h.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(h => h.Car)
                    .ThenInclude(c => c.CarModel)
                .Include(h => h.Car)
                    .ThenInclude(c => c.Client)
                        .ThenInclude(cl => cl.User)
                .Include(h => h.Service)
                .AsQueryable();

            if (serviceId.HasValue)
                query = query.Where(h => h.ServiceId == serviceId.Value);

            if (carId.HasValue)
                query = query.Where(h => h.CarId == carId.Value);

            return await query.ToListAsync();
        }

        public async Task<CarHistory?> GetCarHistoryByIdAsync(int id)
        {
            return await _context.CarHistories
                .Include(h => h.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(h => h.Car)
                    .ThenInclude(c => c.CarModel)
                .Include(h => h.Car)
                    .ThenInclude(c => c.Client)
                        .ThenInclude(cl => cl.User)
                .Include(h => h.Service)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<bool> DeleteCarHistoryAsync(int id)
        {
            var history = await _context.CarHistories.FindAsync(id);
            if (history == null) return false;

            _context.CarHistories.Remove(history);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== REVIEWS =====================

        public async Task<List<Review>> GetReviewsForServiceAsync(int serviceId)
        {
            return await _context.Reviews
                .Where(r => r.ServiceId == serviceId)
                .OrderByDescending(r => r.ReviewDate)
                .ToListAsync();
        }

        public async Task<List<Review>> GetAllReviewsAsync(int? serviceId = null, int? clientId = null)
        {
            var query = _context.Reviews
                .Include(r => r.Service)
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)
                .AsQueryable();

            if (serviceId.HasValue)
                query = query.Where(r => r.ServiceId == serviceId.Value);

            if (clientId.HasValue)
                query = query.Where(r => r.ClientId == clientId.Value);

            return await query
                .OrderByDescending(r => r.ReviewDate)
                .ToListAsync();
        }

        public async Task<Review?> GetReviewByIdAsync(int id)
        {
            return await _context.Reviews
                .Include(r => r.Service)
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<bool> DeleteReviewAsync(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return false;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===================== PRIVATE HELPERS =====================

        private async Task DeleteServiceGraphAsync(int serviceId)
        {
            // Conversations -> ChatMessages
            var convIds = await _context.Conversations
                .Where(c => c.ServiceId == serviceId)
                .Select(c => c.Id)
                .ToListAsync();

            if (convIds.Count > 0)
            {
                var msgs = await _context.ChatMessages
                    .Where(m => convIds.Contains(m.ConversationId))
                    .ToListAsync();
                if (msgs.Count > 0)
                    _context.ChatMessages.RemoveRange(msgs);

                var convs = await _context.Conversations
                    .Where(c => c.ServiceId == serviceId)
                    .ToListAsync();
                if (convs.Count > 0)
                    _context.Conversations.RemoveRange(convs);
            }

            // Reviews
            var reviews = await _context.Reviews.Where(r => r.ServiceId == serviceId).ToListAsync();
            if (reviews.Count > 0)
                _context.Reviews.RemoveRange(reviews);

            // Appointments
            var appts = await _context.Appointments.Where(a => a.ServiceId == serviceId).ToListAsync();
            if (appts.Count > 0)
                _context.Appointments.RemoveRange(appts);

            // CarHistories
            var histories = await _context.CarHistories.Where(h => h.ServiceId == serviceId).ToListAsync();
            if (histories.Count > 0)
                _context.CarHistories.RemoveRange(histories);

            // ClosedDays
            var closed = await _context.ClosedDays.Where(cd => cd.ServiceId == serviceId).ToListAsync();
            if (closed.Count > 0)
                _context.ClosedDays.RemoveRange(closed);

            // ServiceServiceTypes (join)
            var joins = await _context.ServiceServiceTypes
                .Where(x => x.ServiceId == serviceId)
                .ToListAsync();
            if (joins.Count > 0)
                _context.ServiceServiceTypes.RemoveRange(joins);

            // Service
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service != null)
                _context.Services.Remove(service);
        }

        private async Task DeleteClientGraphAsync(int clientId)
        {
            // Conversations -> ChatMessages
            var convIds = await _context.Conversations
                .Where(c => c.ClientId == clientId)
                .Select(c => c.Id)
                .ToListAsync();

            if (convIds.Count > 0)
            {
                var msgs = await _context.ChatMessages
                    .Where(m => convIds.Contains(m.ConversationId))
                    .ToListAsync();
                if (msgs.Count > 0)
                    _context.ChatMessages.RemoveRange(msgs);

                var convs = await _context.Conversations
                    .Where(c => c.ClientId == clientId)
                    .ToListAsync();
                if (convs.Count > 0)
                    _context.Conversations.RemoveRange(convs);
            }

            // Reviews
            var reviews = await _context.Reviews.Where(r => r.ClientId == clientId).ToListAsync();
            if (reviews.Count > 0)
                _context.Reviews.RemoveRange(reviews);

            // Appointments
            var appts = await _context.Appointments.Where(a => a.ClientId == clientId).ToListAsync();
            if (appts.Count > 0)
                _context.Appointments.RemoveRange(appts);

            // Cars + CarHistories
            var carIds = await _context.Cars
                .Where(c => c.ClientId == clientId)
                .Select(c => c.Id)
                .ToListAsync();

            if (carIds.Count > 0)
            {
                var histories = await _context.CarHistories
                    .Where(h => carIds.Contains(h.CarId))
                    .ToListAsync();
                if (histories.Count > 0)
                    _context.CarHistories.RemoveRange(histories);

                var cars = await _context.Cars
                    .Where(c => c.ClientId == clientId)
                    .ToListAsync();
                if (cars.Count > 0)
                    _context.Cars.RemoveRange(cars);
            }

            // Client
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
            if (client != null)
                _context.Clients.Remove(client);
        }
    }
}