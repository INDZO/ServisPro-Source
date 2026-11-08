using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using ServisPro.Services;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IClientRepository _clientRepository;
        private readonly IServiceRepository _serviceRepository;
        private readonly IServiceTypeRepository _serviceTypeRepository;
        private readonly IOtpService _otpService;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IEmailSender _emailSender;
        private readonly IPasswordHasher _passwordHasher;

        public AuthController(
            IUserRepository userRepository,
            IClientRepository clientRepository,
            IServiceRepository serviceRepository,
            IServiceTypeRepository serviceTypeRepository,
            IOtpService otpService,
            IJwtTokenService jwtTokenService,
            IEmailSender emailSender,
            IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _clientRepository = clientRepository;
            _serviceRepository = serviceRepository;
            _serviceTypeRepository = serviceTypeRepository;
            _otpService = otpService;
            _jwtTokenService = jwtTokenService;
            _emailSender = emailSender;
            _passwordHasher = passwordHasher;
        }

        // POST: api/auth/register-user
        [HttpPost("register-user")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterUser([FromBody] RegisterUserRequest request)
        {
            if (await _userRepository.EmailExistsAsync(request.Email))
                return BadRequest("Email je već zauzet.");

            if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
                return BadRequest("Nepoznat role. Dozvoljeno: Client ili Service.");

            var user = new User
            {
                Email = request.Email,
                Password = _passwordHasher.HashPassword(request.Password),
                Role = role,
                IsApproved = false
            };

            await _userRepository.CreateAsync(user);

            return Ok(new
            {
                userId = user.Id,
                role = user.Role.ToString(),
                message = role == UserRole.Client
                    ? "Korisnik kreiran. Nastavite sa unosom klijentskog profila."
                    : "Korisnik kreiran. Nastavite sa unosom podataka o servisu."
            });
        }

        // POST: api/auth/create-client-profile
        [HttpPost("create-client-profile")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateClientProfile([FromBody] CreateClientProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
                return NotFound("Korisnik nije pronađen.");

            if (user.Role != UserRole.Client)
                return BadRequest("Ovaj korisnik nije klijentskog tipa.");

            if (await _clientRepository.ExistsForUserAsync(user.Id))
                return BadRequest("Profil klijenta je već kreiran.");

            var client = new Client
            {
                UserId = user.Id,
                FullName = request.FullName,
                ImageUrl = request.ImageUrl,
                ImagePublicId = request.ImagePublicId
            };

            await _clientRepository.CreateAsync(client);

            await _otpService.GenerateAndSendOtpAsync(user);

            return Ok("Klijentski profil uspešno kreiran. Proverite email za verifikacioni kod.");
        }

        // POST: api/auth/create-service-profile
        [HttpPost("create-service-profile")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateServiceProfile([FromBody] CreateServiceProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
                return NotFound("Korisnik nije pronađen.");

            if (user.Role != UserRole.Service)
                return BadRequest("Ovaj korisnik nije servisnog tipa.");

            if (await _serviceRepository.ExistsForUserAsync(user.Id))
                return BadRequest("Servis profil je već kreiran.");

            if(request.ServiceTypeIds == null || !request.ServiceTypeIds.Any())
                return BadRequest("Mora biti izabran bar jedan tip usluge.");

            var allExist = await _serviceTypeRepository.AllExistAsync(request.ServiceTypeIds);
            if (!allExist)
                return BadRequest("Jedan ili više izabranih tipova usluga nisu validni.");

            var service = new Service
            {
                UserId = user.Id,
                Name = request.Name,
                PIB = request.PIB,
                Description = request.Description,
                Adress = request.Adress,
                City = request.City,
                WorkingHours = request.WorkingHours,
                WorkingDays = string.Join(",", request.WorkingDays),
                OwnerFullName = request.OwnerFullName,
                PhoneNumber = request.PhoneNumber,
                GoogleMapsLink = request.GoogleMapsLink,
                ImageUrl = request.ImageUrl,
                ImagePublicId = request.ImagePublicId,
                IsActive = false
            };

            await _serviceRepository.CreateAsync(service, request.ServiceTypeIds);

            await _emailSender.SendEmailAsync(
                user.Email,
                "ServisPro - prijava servisa primljena",
                "Vaša prijava za registraciju servisa je uspešno primljena. Nakon pregleda admin tima bićete obavešteni o statusu."
            );

            return Ok("Servis profil uspešno kreiran. Čeka se odobrenje admin tima.");
        }

        // GET: api/auth/usluge
        [HttpGet("usluge")]
        [AllowAnonymous]
        public async Task<IActionResult> GetServiceTypes()
        {
            return Ok(await _serviceTypeRepository.GetAllAsync());
        }

        // POST: api/auth/verify-email
        [HttpPost("verify-email")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            var isValid = await _otpService.ValidateOtpAsync(request.Email, request.Code);
            if (!isValid)
            {
                return BadRequest("Neispravan ili istekao verifikacioni kod.");
            }

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return NotFound("Korisnik nije pronađen.");
            }

            await _otpService.ClearOtpAsync(request.Email);

            var token = _jwtTokenService.GenerateToken(user);

                return Ok(new
                {
                    message = "Email je uspešno verifikovan.",
                    token,
                    role = user.Role.ToString(),
                    userId = user.Id
                });
        }

        // POST: api/auth/resend-otp
        [HttpPost("resend-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendOtp([FromBody] VerifyEmailRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return NotFound("Korisnik sa tom email adresom ne postoji.");
            }

            if (user.Role != UserRole.Client)
            {
                return BadRequest("Verifikacija OTP kodom je predviđena samo za klijente.");
            }

            await _otpService.GenerateAndSendOtpAsync(user);

            return Ok("Novi verifikacioni kod je poslat na vašu email adresu.");
        }


        // POST: /api/auth/login
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
                return Unauthorized("Pogrešan email ili lozinka.");

            if (!_passwordHasher.VerifyPassword(user.Password, request.Password))
                return Unauthorized("Pogrešan email ili lozinka.");

            // Ako je Client, mora postojati client profil
            if (user.Role == UserRole.Client)
            {
                var client = await _clientRepository.GetByUserIdAsync(user.Id);
                if (client == null)
                {
                    return Ok(new
                    {
                        continueRegistration = true,
                        step = "create-client-profile",
                        userId = user.Id,
                        role = user.Role.ToString(),
                        email = user.Email,
                        message = "Nalog postoji, ali profil klijenta nije završen."
                    });
                }
            }

            // Ako je Service, mora postojati service profil
            if (user.Role == UserRole.Service)
            {
                var service = await _serviceRepository.GetByUserIdAsync(user.Id);
                if (service == null)
                {
                    return Ok(new
                    {
                        continueRegistration = true,
                        step = "create-service-profile",
                        userId = user.Id,
                        role = user.Role.ToString(),
                        email = user.Email,
                        message = "Nalog postoji, ali profil servisa nije završen."
                    });
                }
            }

            // Kod tebe: IsApproved za Client znači verifikacija emaila (tj. nije odobren => verify-email)
            if (user.Role == UserRole.Client && !user.IsApproved)
            {
                return Ok(new
                {
                    continueRegistration = true,
                    step = "verify-email",
                    userId = user.Id,
                    role = user.Role.ToString(),
                    email = user.Email,
                    allowResendOtp = true,
                    message = "Email nije verifikovan. Unesite kod koji je poslat na email."
                });
            }

            // Kod tebe: IsApproved za Service znači odobrenje admina (nije odobren => awaiting-approval)
            if (user.Role == UserRole.Service && !user.IsApproved)
            {
                return Ok(new
                {
                    continueRegistration = true,
                    step = "awaiting-approval",
                    userId = user.Id,
                    role = user.Role.ToString(),
                    email = user.Email,
                    message = "Nalog servisa čeka odobrenje admina."
                });
            }

            var token = _jwtTokenService.GenerateToken(user);

            return Ok(new
            {
                token,
                role = user.Role.ToString(),
                userId = user.Id
            });
        }

        //POST: api/auth/forgot-password
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
                return NotFound("Korisnik sa datim emailom ne postoji.");

            await _otpService.GenerateAndSendOtpAsync(user);

            return Ok("Verifikacioni kod za reset lozinke je poslat na email.");
        }

        //POST: api/auth/verify-reset-otp
        [HttpPost("verify-reset-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyResetOtpRequest request)
        {
            var isValid = await _otpService.ValidateResetOtpAsync(request.Email, request.Code);
            if (!isValid)
                return BadRequest("Neispravan ili istekao kod.");

            return Ok("Kod je validan. Možete resetovati lozinku.");
        }

        //POST: api/auth/reset-password
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var isValid = await _otpService.ValidateResetOtpAsync(request.Email, request.Code);
            if (!isValid)
                return BadRequest("Neispravan ili istekao kod.");

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
                return NotFound("Korisnik nije pronađen.");

            user.Password = _passwordHasher.HashPassword(request.NewPassword);

            await _userRepository.SaveChangesAsync();
            await _otpService.ClearOtpAsync(request.Email); 

            return Ok("Lozinka uspešno resetovana.");
        }


    }
}
