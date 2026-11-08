namespace ServisPro.Models.DTO
{
    public class ServiceFilterQuery
    {
        public string? City { get; set; }
        public string? Search { get; set; }

        public List<int> ServiceTypeIds { get; set; } = new();

        //[mon, tue,...]
        public string? WorkingDay { get; set; }

        // "name", "rating", "reviews"
        public string? SortBy { get; set; } = "name";

        // "asc" ili "desc"
        public string? SortDirection { get; set; } = "asc";

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
    }

    public class ServiceListItemDto
    {
        public int ServiceUserId { get; set; }
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string City { get; set; } = null!;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        public double? AverageRating { get; set; }
        public int ReviewsCount { get; set; }

        public List<string> ServiceTypes { get; set; } = new();
    }

    public class ServiceDetailsDto
    {
        public int ServiceUserId { get; set; }
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string PIB { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string Adress { get; set; } = null!;
        public string City { get; set; } = null!;
        public string WorkingHours { get; set; } = null!;
        public string OwnerFullName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public string? GoogleMapsLink { get; set; }

        public double? AverageRating { get; set; }
        public int ReviewsCount { get; set; }

        public List<string> ServiceTypes { get; set; } = new();
        public List<string> WorkingDays { get; set; } = new();

        public List<ReviewDto> Reviews { get; set; } = new();
    }

    public class ReviewDto
    {
        public int Id { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; } 
        public DateTime ReviewDate { get; set; }
        public string ClientName { get; set; } = "Anonimni korisnik";
        public string? ImageUrl { get; set; } 
    }

    public class ReviewFilterQuery
    {
        public int? RatingFilter { get; set; } 
        public string? SortBy { get; set; } = "date";
        public string? SortDirection { get; set; } = "desc";
    }
    public class ServiceProfileDto
    {
        public int ServiceId { get; set; }
        public string Name { get; set; } = null!;
        public string PIB { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string Adress { get; set; } = null!;
        public string City { get; set; } = null!;
        public string WorkingHours { get; set; } = null!;
        public List<string> WorkingDays { get; set; } = new();
        public string OwnerFullName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public string? GoogleMapsLink { get; set; }
        public List<string> ServiceTypes { get; set; } = new();
    }

    public class UpdateServiceProfileRequest
    {
        public string Name { get; set; } = null!;
        public string PIB { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string Adress { get; set; } = null!;
        public string City { get; set; } = null!;
        public string WorkingHours { get; set; } = null!;
        public List<string> WorkingDays { get; set; } = new();
        public string OwnerFullName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string? GoogleMapsLink { get; set; }
    }
    public class UpdateServiceTypesRequest
    {
        public List<int> TypeIds { get; set; } = new();
    }
    public class ClosedDayRequestDTO
    {
        public DateTime Date { get; set; }
        public string? Reason { get; set; }
        public int ServiceId { get; set; }
    }

}
