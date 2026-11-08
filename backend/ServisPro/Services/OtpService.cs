using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;

namespace ServisPro.Services
{
    public class OtpService : IOtpService
    {
        private readonly ServisProDbContext _context;
        private readonly IEmailSender _emailSender;

        public OtpService(ServisProDbContext context, IEmailSender emailSender)
        {
            _context = context;
            _emailSender = emailSender;
        }
        public async Task GenerateAndSendOtpAsync(User user)
        {
            var existingOtp = await _context.EmailOTPs
                .Where(otp => otp.UserId == user.Id && !otp.IsUsed && otp.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();

            string otpCode;
            int remainingMinutes;


            if (existingOtp != null)
            {
                var timeLeft = existingOtp.ExpiresAt - DateTime.UtcNow;

                if (timeLeft > TimeSpan.FromMinutes(1))
                {
                    otpCode = existingOtp.OTPCode;
                    remainingMinutes = (int)timeLeft.TotalMinutes;
                }
                else
                {
                    otpCode = new Random().Next(100000, 999999).ToString();
                    remainingMinutes = 10;

                    var newOtp = new EmailOTP
                    {
                        UserId = user.Id,
                        OTPCode = otpCode,
                        ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                        IsUsed = false
                    };

                    _context.EmailOTPs.Add(newOtp);
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                otpCode = new Random().Next(100000, 999999).ToString();
                remainingMinutes = 10;

                var otp = new EmailOTP
                {
                    UserId = user.Id,
                    OTPCode = otpCode,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                    IsUsed = false
                };

                _context.EmailOTPs.Add(otp);
                await _context.SaveChangesAsync();
            }

            var subject = "ServisPro - verifikacioni kod";
            var body = $"Vaš verifikacioni kod je: {otpCode}. Kod ističe za {remainingMinutes} minuta.";

            await _emailSender.SendEmailAsync(user.Email, subject, body);
        }



        public async Task<bool> ValidateOtpAsync(string email, string otpCode)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return false;
            }

            var otp = await _context.EmailOTPs
                .Where(o => o.UserId == user.Id  && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();

            if(otp == null) 
            {
                return false;
            }
            if (otp.OTPCode != otpCode)
            {
                return false;
            }

            otp.IsUsed = true;
            user.IsApproved = true;

            await _context.SaveChangesAsync();

            await _emailSender.SendEmailAsync(user.Email, "ServisPro - Uspešna verifikacija", "Vaš nalog je uspešno verifikovan.");

            return true;
        }
        public async Task<bool> ValidateResetOtpAsync(string email, string otpCode)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            var otp = await _context.EmailOTPs
                .Where(o => o.UserId == user.Id && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();

            if (otp == null || otp.OTPCode != otpCode)
                return false;

            otp.IsUsed = true;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task ClearOtpAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return;

            var otps = await _context.EmailOTPs
                .Where(o => o.UserId == user.Id)
                .ToListAsync();

            _context.EmailOTPs.RemoveRange(otps);

            await _context.SaveChangesAsync();
        }
    }
}
