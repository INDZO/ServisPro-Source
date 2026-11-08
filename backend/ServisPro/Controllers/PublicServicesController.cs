using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PublicServicesController : ControllerBase
    {
        private readonly IServiceRepository _serviceRepository;

        public PublicServicesController(IServiceRepository serviceRepository)
        {
            _serviceRepository = serviceRepository;
        }

        // GET /api/public/services
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<PagedResult<ServiceListItemDto>>> GetServices(
            [FromQuery] ServiceFilterQuery query)
        {
            var (services, totalCount) = await _serviceRepository.GetPublicServicesAsync(
                query.City,
                query.Search,
                query.ServiceTypeIds,
                query.WorkingDay,
                query.SortBy,
                query.SortDirection,
                query.PageNumber,
                query.PageSize
            );

            var items = services.Select(s =>
            {
                double? avgRating = s.Reviews
                    .Where(r => r.Rating > 0)
                    .Select(r => (double?)r.Rating)
                    .DefaultIfEmpty(null)
                    .Average();

                return new ServiceListItemDto
                {   
                    ServiceUserId = s.UserId, 
                    Id = s.Id,
                    Name = s.Name,
                    City = s.City,
                    Description = s.Description,
                    ImageUrl = s.ImageUrl,
                    AverageRating = avgRating,
                    ReviewsCount = s.Reviews.Count,
                    ServiceTypes = s.ServiceServiceTypes
                        .Select(st => st.ServiceType.Name)
                        .ToList()
                };
            }).ToList();

            var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

            var result = new PagedResult<ServiceListItemDto>
            {
                Items = items,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };

            return Ok(result);
        }

        // GET /api/public/services/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<ServiceDetailsDto>> GetServiceById(
            int id,
            [FromQuery] ReviewFilterQuery reviewQuery)
        {
            var service = await _serviceRepository.GetPublicServiceWithDetailsAsync(id);

            if (service == null)
            {
                return NotFound();
            }

            double? avgRating = service.Reviews
                    .Where(r => r.Rating > 0)
                    .Select(r => (double?)r.Rating)
                    .DefaultIfEmpty(null)
                    .Average();


            var dto = new ServiceDetailsDto
            {
                ServiceUserId = service.UserId,
                Id = service.Id,
                Name = service.Name,
                PIB = service.PIB,
                Description = service.Description,
                Adress = service.Adress,
                City = service.City,
                WorkingHours = service.WorkingHours,
                OwnerFullName = service.OwnerFullName,
                PhoneNumber = service.PhoneNumber,
                ImageUrl = service.ImageUrl,
                GoogleMapsLink = service.GoogleMapsLink,
                AverageRating = avgRating,
                ReviewsCount = service.Reviews.Count,
                ServiceTypes = service.ServiceServiceTypes
                    .Select(st => st.ServiceType.Name)
                    .ToList(),
                WorkingDays = service.WorkingDays
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(d => d.Trim())
                    .ToList()
            };

            // filtriranje + sortiranje reviews
            var reviewsQuery = service.Reviews.AsQueryable();

            if (reviewQuery.RatingFilter.HasValue)
            {
                reviewsQuery = reviewsQuery
                    .Where(r => r.Rating == reviewQuery.RatingFilter.Value);
            }

            bool revDesc = string.Equals(reviewQuery.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
            var sortByLower = reviewQuery.SortBy?.ToLower() ?? "date";

            reviewsQuery = sortByLower switch
            {
                "rating" => revDesc
                    ? reviewsQuery.OrderByDescending(r => r.Rating)
                    : reviewsQuery.OrderBy(r => r.Rating),

                "date" or _ => revDesc
                    ? reviewsQuery.OrderByDescending(r => r.ReviewDate)
                    : reviewsQuery.OrderBy(r => r.ReviewDate)
            };

            dto.Reviews = reviewsQuery
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ReviewDate = r.ReviewDate,
                    ClientName = r.Client != null ? r.Client.FullName : "Anonimni korisnik",
                    ImageUrl = r.Client != null ? r.Client.ImageUrl : null
                })
                .ToList();

            return Ok(dto);
        }
    }
}
