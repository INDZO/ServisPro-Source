
using Microsoft.Extensions.Options;
using ServisPro.Models.Config;
using System.Net;
using System.Net.Mail;

namespace ServisPro.Services
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly EmailSettings _settings;
        public SmtpEmailSender(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }
        public async Task SendEmailAsync(string to, string subject, string body)
        {
            if (string.IsNullOrWhiteSpace(to))
                throw new ArgumentException("Email je prazan");

            var validatedTo = new MailAddress(to.Trim());

            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                UseDefaultCredentials = false, 
                Credentials = new NetworkCredential(
                    _settings.Username,
                    _settings.Password
                )
            };


            using var message = new MailMessage
            {
                From = new MailAddress(_settings.From, "ServisPro Team"),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };

            message.To.Add(validatedTo.Address);

            await client.SendMailAsync(message);
        }


    }
}
