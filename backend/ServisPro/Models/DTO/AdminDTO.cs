using ServisPro.Models.Domain;

namespace ServisPro.Models.DTO
{
    public class AdminPendingServiceDto
    {
        public int ServiceId { get; set; }
        public string Name { get; set; } = default!;
        public string City { get; set; } = default!;
        public string PIB { get; set; } = default!;
        public string OwnerFullName { get; set; } = default!;
        public string Email { get; set; } = default!;
    }

    public class AdminActionReasonDto
    {
        public string? Reason { get; set; }
    }

    public class AdminUserDto
    {
        public int UserId { get; set; }
        public string Email { get; set; } = default!;
        public UserRole Role { get; set; }
        public bool IsApproved { get; set; }
    }

    public class ServiceTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
    }

    public class CreateServiceTypeDto
    {
        public string Name { get; set; } = default!;
    }

    public class UpdateServiceTypeDto
    {
        public string Name { get; set; } = default!;
    }

    public class CarBrandDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
    }

    public class CreateCarBrandDto
    {
        public string Name { get; set; } = default!;
    }

    public class UpdateCarBrandDto
    {
        public string Name { get; set; } = default!;
    }

    public class CarModelDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public int CarBrandId { get; set; }
    }

    public class CreateCarModelDto
    {
        public string Name { get; set; } = default!;
        public int CarBrandId { get; set; }
    }

    public class UpdateCarModelDto
    {
        public string Name { get; set; } = default!;
    }

    public class ReviewAdminDto
    {
        public int Id { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = default!;
        public DateTime ReviewDate { get; set; }
        public int ClientId { get; set; }
        public int ServiceId { get; set; }
    }

    public class AdminServiceListDto
    {
        public int ServiceId { get; set; }
        public string Name { get; set; } = "";
        public string City { get; set; } = "";
        public string PIB { get; set; } = "";
        public string OwnerFullName { get; set; } = "";
        public string Email { get; set; } = "";
        public bool IsActive { get; set; }
        public bool IsApproved { get; set; }
    }

    public class AdminCarListDto
    {
        public int CarId { get; set; }
        public string VIN { get; set; } = "";
        public int? Year { get; set; }
        public string BrandName { get; set; } = "";
        public string ModelName { get; set; } = "";
        public int ClientId { get; set; }
        public string ClientName { get; set; } = "";
        public string ClientEmail { get; set; } = "";
    }

    public class AdminAppointmentListDto
    {
        public int AppointmentId { get; set; }
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = "";
        public int ClientId { get; set; }
        public string ClientName { get; set; } = "";
        public string ClientEmail { get; set; } = "";
        public DateTime AppointmentDate { get; set; }
        public TimeSpan? AppointmentTime { get; set; }  // kako već čuvaš (string)
        public string Status { get; set; } = "";          // mapiran naziv (ne broj)
        public string Description { get; set; } = "";
    }

    public class AdminCarHistoryListDto
    {
        public int CarHistoryId { get; set; }
        public int CarId { get; set; }
        public string CarLabel { get; set; } = ""; // npr "BMW 320d (VIN...)"
        public string ClientName { get; set; } = "";
        public string ClientEmail { get; set; } = "";
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = "";
        public DateTime ServiceDate { get; set; }
        public int? Mileage { get; set; }
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
    }

    public class AdminReviewListDto
    {
        public int ReviewId { get; set; }
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = "";
        public int ClientId { get; set; }
        public string ClientName { get; set; } = "";
        public string ClientEmail { get; set; } = "";
        public int Rating { get; set; }
        public string Comment { get; set; } = "";
        public DateTime ReviewDate { get; set; }
    }
}
