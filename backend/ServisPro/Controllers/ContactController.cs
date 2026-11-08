using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.DTO;
using ServisPro.Services;
using System.Net.Mail;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class ContactController : ControllerBase
    {
        private readonly IEmailSender _emailSender;
        private readonly IConfiguration _configuration;

        public ContactController(IEmailSender emailSender, IConfiguration configuration)
        {
            _emailSender = emailSender;
            _configuration = configuration;
        }


        // POST: api/Contact
        [HttpPost]
        public async Task<IActionResult> Send([FromBody] ContactRequest request)
        {
            if (request == null)
                return BadRequest("Neispravan payload.");

            var email = (request.Email ?? string.Empty).Trim();
            var title = (request.Title ?? string.Empty).Trim();
            var message = (request.Message ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email je obavezan.");
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest("Naslov je obavezan.");
            if (string.IsNullOrWhiteSpace(message))
                return BadRequest("Poruka je obavezna.");

            if (title.Length < 3 || title.Length > 120)
                return BadRequest("Naslov mora imati 3–120 karaktera.");

            if (message.Length < 10 || message.Length > 2000)
                return BadRequest("Poruka mora imati 10–2000 karaktera.");

            try
            {
                _ = new MailAddress(email);
            }
            catch
            {
                return BadRequest("Unesite ispravan email.");
            }

            var recipient = "contact@example.invalid";
            if (string.IsNullOrWhiteSpace(recipient))
                return StatusCode(500, "RecipientEmail nije podešen na serveru.");

            var prefix = "[ServisPro Kontakt]";

            var subject = $"{prefix} {title} - {email}";

            var body =
                    $@"Kontakt poruka (ServisPro)

                    Od: {email}
                    Naslov: {title}

                    Poruka:
                    {message}
                    ";

            try
            {
                 await _emailSender.SendEmailAsync(recipient, subject, body);

                return Ok("Poruka je poslata.");
            }
            catch
            {
                return StatusCode(500, "Došlo je do greške prilikom slanja poruke.");
            }
        }
    }
}