using ServisPro.Models.Domain;

namespace ServisPro.Services
{
    public interface IOtpService
    {
        Task GenerateAndSendOtpAsync(User user);
        Task<bool> ValidateOtpAsync(string email, string otpCode);
        Task<bool> ValidateResetOtpAsync(string email, string otpCode);
        Task ClearOtpAsync(string email);

    }
}
