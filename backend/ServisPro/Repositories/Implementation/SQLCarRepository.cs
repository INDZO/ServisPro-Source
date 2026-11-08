using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLCarRepository : ICarRepository
    {
        private readonly ServisProDbContext _context;

        public SQLCarRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CarVinExistsAsync(string vin)
        {
            return await _context.Cars.AnyAsync(c => c.VIN == vin);
        }

        public async Task<Car?> AddCarForUserAsync(
            int userId,
            string vin,
            int? year,
            int carBrandId,
            int carModelId)
        {
            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (client == null)
            {
                return null;
            }

            var car = new Car
            {
                VIN = vin,
                Year = year,
                ClientId = client.Id,
                CarBrandId = carBrandId,
                CarModelId = carModelId
            };

            _context.Cars.Add(car);
            await _context.SaveChangesAsync();

            await _context.Entry(car).Reference(c => c.CarBrand).LoadAsync();
            await _context.Entry(car).Reference(c => c.CarModel).LoadAsync();

            return car;
        }

        public async Task<List<Car>> GetCarsForUserAsync(int userId, string? vinSearch)
        {
            var query = _context.Cars
                .Include(c => c.CarBrand)
                .Include(c => c.CarModel)
                .Where(c => c.Client.UserId == userId);

            if (!string.IsNullOrWhiteSpace(vinSearch))
            {
                query = query.Where(c => c.VIN.Contains(vinSearch));
            }

            return await query
                .OrderBy(c => c.Id)
                .ToListAsync();
        }

        public async Task<Car?> GetCarWithHistoryForUserAsync(int carId, int userId)
        {
            return await _context.Cars
                .Include(c => c.CarBrand)
                .Include(c => c.CarModel)
                .Include(c => c.CarHistories)
                    .ThenInclude(h => h.Service)
                .Include(c => c.CarHistories)
                    .ThenInclude(h => h.ServiceType)
                .Where(c => c.Client.UserId == userId)
                .FirstOrDefaultAsync(c => c.Id == carId);
        }

        public async Task<bool> DeleteCarForUserAsync(int carId, int userId)
        {
            var car = await _context.Cars
                .Where(c => c.Client.UserId == userId)
                .FirstOrDefaultAsync(c => c.Id == carId);

            if (car == null)
                return false;

            _context.Cars.Remove(car);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<CarHistory>> GetMileageHistoryForUserAsync(int carId, int userId)
        {
            var car = await _context.Cars
                .Where(c => c.Client.UserId == userId)
                .Include(c => c.CarHistories)
                .FirstOrDefaultAsync(c => c.Id == carId);

            if (car == null)
                return new List<CarHistory>();

            return car.CarHistories
                .OrderBy(h => h.ServiceDate)
                .ToList();
        }

        public async Task<Car?> GetCarWithHistoryByVinAsync(string vin)
        {
            return await _context.Cars
                .Include(c => c.CarBrand)
                .Include(c => c.CarModel)
                .Include(c => c.CarHistories)
                    .ThenInclude(h => h.Service)
                .Include(c => c.CarHistories)
                    .ThenInclude(h => h.ServiceType)
                .FirstOrDefaultAsync(c => c.VIN == vin);
        }
        public async Task<Car?> GetCarByVINWithMileageHistoryAsync(string vin)
        {
            return await _context.Cars
                .Include(c => c.CarHistories)
                .FirstOrDefaultAsync(c => c.VIN == vin);
        }
        public async Task<List<Appointment>> GetCarsInServiceAsync(int serviceId)
        {
            return await _context.Appointments
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarBrand)
                .Include(a => a.Car)
                    .ThenInclude(c => c.CarModel)
                .Where(a => a.ServiceId == serviceId &&
                       (a.Status == AppointmentStatus.InService ||
                        a.Status == AppointmentStatus.InProgress))
                .ToListAsync();
        }
        public async Task<Service?> GetServiceByUserIdAsync(int userId)
        {
            return await _context.Services.FirstOrDefaultAsync(s => s.UserId == userId);
        }


    }
}
