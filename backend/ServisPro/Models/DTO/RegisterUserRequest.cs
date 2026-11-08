namespace ServisPro.Models.DTO
{
        public class RegisterUserRequest
        {
            public string Email { get; set; } = null!;
            public string Password { get; set; } = null!;
            public string Role { get; set; } = null!;
        }

        public class CreateClientProfileRequest
        {
            public int UserId { get; set; }
            public string FullName { get; set; } = null!;
            public string? ImageUrl { get; set; }
            public string? ImagePublicId { get; set; }
    }

        public class CreateServiceProfileRequest
        {
            public int UserId { get; set; }
            public string Name { get; set; } = null!;
            public string PIB { get; set; } = null!;
            public string Description { get; set; } = null!;
            public string Adress { get; set; } = null!;
            public string City { get; set; } = null!;
            public string WorkingHours { get; set; } = null!;
            public List<string> WorkingDays { get; set; } = new(); //salju se nazivi checkboxova recimo mon, tue
            public string OwnerFullName { get; set; } = null!;
            public string PhoneNumber { get; set; } = null!;
            public string? GoogleMapsLink { get; set; }
            public string? ImageUrl { get; set; }
            public string? ImagePublicId { get; set; }
            public List<int> ServiceTypeIds { get; set; } = new();
    }

        public class VerifyEmailRequest
        {
            public string Email { get; set; } = null!;
            public string Code { get; set; } = null!;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = null!;
            public string Password { get; set; } = null!;
        }

        public class PendingServiceDto
        {
            public int ServiceId { get; set; }
            public string ServiceName { get; set; } = null!;
            public string Description { get; set; } = string.Empty;
            public string PIB { get; set; } = null!;
            public string Email { get; set; } = null!;
            public string Adress { get; set; } = null!;
            public string City { get; set; } = null!;
            public string OwnerFullName { get; set; } = null!;
            public string PhoneNumber { get; set; } = null!;
        }
        public class ForgotPasswordRequest
        {
            public string Email { get; set; } = null!;
        }

        public class VerifyResetOtpRequest
        {
            public string Email { get; set; } = null!;
            public string Code { get; set; } = null!;
        }

        public class ResetPasswordRequest
        {
            public string Email { get; set; } = null!;
            public string Code { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }


}
