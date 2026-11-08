using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Repositories.Interface;
using System.Security.Claims;
using static ServisPro.Models.DTO.CarDTO;

[Route("api/service/cars")]
[ApiController]
[Authorize(Roles = "Service")]
public class ServiceCarsController : ControllerBase
{
    private readonly ICarRepository _carRepository;

    public ServiceCarsController(ICarRepository carRepository)
    {
        _carRepository = carRepository;
    }
    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
            return -1;

        return userId;
    }


    // GET: api/service/cars/details?vin=XYZ123
    [HttpGet("details")]
    public async Task<ActionResult<CarDetailsDto>> GetCarDetailsByVin([FromQuery] string vin)
    {
        if (string.IsNullOrWhiteSpace(vin))
            return BadRequest("VIN je obavezan.");

        var car = await _carRepository.GetCarWithHistoryByVinAsync(vin);

        if (car == null)
            return NotFound("Vozilo sa ovim VIN brojem ne postoji.");

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
    [HttpGet("mileage-history")]
    public async Task<ActionResult<IEnumerable<MileagePointDto>>> GetMileageHistoryByVIN([FromQuery] string vin)
    {
        if (string.IsNullOrWhiteSpace(vin))
            return BadRequest("VIN je obavezan.");

        var car = await _carRepository.GetCarByVINWithMileageHistoryAsync(vin);

        if (car == null)
            return NotFound("Vozilo sa ovim VIN brojem ne postoji.");

        var result = car.CarHistories
            .OrderBy(h => h.ServiceDate)
            .Select(h => new MileagePointDto
            {
                ServiceDate = h.ServiceDate,
                Mileage = h.Mileage
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("in-service")]
    public async Task<ActionResult<IEnumerable<CarInServiceDto>>> GetCarsCurrentlyInService()
    {
        int userId = GetCurrentUserId();
        if (userId == -1)
            return Unauthorized();

        var service = await _carRepository.GetServiceByUserIdAsync(userId);
        if (service == null)
            return NotFound("Servis za ovog korisnika ne postoji.");

        var cars = await _carRepository.GetCarsInServiceAsync(service.Id);

        var result = cars.Select(a => new CarInServiceDto
        {
            CarId = a.Car.Id,
            VIN = a.Car.VIN,
            Brand = a.Car.CarBrand.Name,
            Model = a.Car.CarModel.Name,
            Status = a.Status,
            AppointmentDate = a.AppointmentDate,
            Year = a.Car.Year

        }).ToList();

        return Ok(result);
    }


}
