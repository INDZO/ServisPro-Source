using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using System.Security.Claims;
using static ServisPro.Models.DTO.CarDTO;

namespace ServisPro.Controllers
{
    [Route("api/client/cars")]
    [ApiController]
    [Authorize(Roles = "Client")]
    public class ClientCarsController : ControllerBase
    {
        private readonly ICarRepository _carRepository;
        private readonly IAdminRepository _adminRepository;

        public ClientCarsController(ICarRepository carRepository, IAdminRepository adminRepository)
        {
            _carRepository = carRepository;
            _adminRepository = adminRepository;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
                return -1;

            return userId;
        }


        // GET: api/client/cars?vin=123
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CarListItemDto>>> GetMyCars([FromQuery] string? vin)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();
            var cars = await _carRepository.GetCarsForUserAsync(userId, vin);

            var result = cars.Select(c => new CarListItemDto
            {
                Id = c.Id,
                VIN = c.VIN,
                Year = c.Year,
                BrandName = c.CarBrand.Name,
                ModelName = c.CarModel.Name
            }).ToList();

            return Ok(result);
        }

        // GET: api/client/cars/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CarDetailsDto>> GetCarById(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();
            var car = await _carRepository.GetCarWithHistoryForUserAsync(id, userId);

            if (car == null)
                return NotFound();

            var details = new CarDetailsDto
            {
                Id = car.Id,
                VIN = car.VIN,
                Year = car.Year,
                BrandName = car.CarBrand.Name,
                ModelName = car.CarModel.Name,
                History = car.CarHistories
                    .OrderByDescending(h => h.ServiceDate)
                    .Select(h => new CarHistoryItemDto
                    {
                        Id = h.Id,
                        Title = h.Title,
                        Description = h.Description,
                        Mileage = h.Mileage,
                        ServiceDate = h.ServiceDate,
                        ServiceName = h.Service.Name,
                        ServiceTypeName = h.ServiceType.Name
                    })
                    .ToList()
            };

            return Ok(details);
        }

        // GET: api/client/cars/{id}/mileage-history
        [HttpGet("{id:int}/mileage-history")]
        public async Task<ActionResult<IEnumerable<MileagePointDto>>> GetMileageHistory(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();
            var history = await _carRepository.GetMileageHistoryForUserAsync(id, userId);

            var result = history
                .OrderBy(h => h.ServiceDate)
                .Select(h => new MileagePointDto
                {
                    ServiceDate = h.ServiceDate,
                    Mileage = h.Mileage
                })
                .ToList();

            return Ok(result);
        }

        // POST: api/client/cars
        [HttpPost]
        public async Task<ActionResult<CarDetailsDto>> CreateCar([FromBody] CarCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();

            if (await _carRepository.CarVinExistsAsync(dto.VIN))
            {
                return BadRequest("Vozilo sa ovim brojem šasije već postoji u sistemu.");
            }

            var car = await _carRepository.AddCarForUserAsync(
                userId,
                dto.VIN,
                dto.Year,
                dto.CarBrandId,
                dto.CarModelId);

            if (car == null)
                return BadRequest("Morate prvo popuniti klijentski profil pre dodavanja vozila.");


            var details = new CarDetailsDto
            {
                Id = car.Id,
                VIN = car.VIN,
                Year = car.Year,
                BrandName = car.CarBrand.Name,
                ModelName = car.CarModel.Name,
                History = new List<CarHistoryItemDto>()
            };

            return CreatedAtAction(nameof(GetCarById), new { id = car.Id }, details);
        }

        // DELETE: api/client/cars/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteCar(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == -1)
                return Unauthorized();
            var deleted = await _carRepository.DeleteCarForUserAsync(id, userId);

            if (!deleted)
                return NotFound();

            return NoContent();
        }

        // GET: api/client/cars/car-brands
        [HttpGet("car-brands")]
        public async Task<ActionResult<IEnumerable<CarBrandDto>>> GetCarBrands()
        {
            var brands = await _adminRepository.GetCarBrandsAsync();
            var result = brands.Select(b => new CarBrandDto
            {
                Id = b.Id,
                Name = b.Name
            });

            return Ok(result);
        }

        // GET: api/client/cars/car-brands/{brandId:int}/models
        [HttpGet("car-brands/{brandId:int}/models")]
        public async Task<ActionResult<IEnumerable<CarModelDto>>> GetModelsByBrand(int brandId)
        {
            var models = await _adminRepository.GetModelsByBrandAsync(brandId);
            var result = models.Select(m => new CarModelDto
            {
                Id = m.Id,
                Name = m.Name,
                CarBrandId = m.CarBrandId
            });

            return Ok(result);
        }
    }
}