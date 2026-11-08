using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Services;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImageController : ControllerBase
    {
        private readonly IImageService _imageService;
        private readonly ServisProDbContext _context;

        private const string DefaultClientImageUrl =
            "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672175/depositphotos_137014128-stock-illustration-user-profile-icon_qg26rb.webp";
        private const string DefaultServiceImageUrl =
            "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672295/vector-detailed-auto-repair-car-600nw-2489397017_wbtz6k.webp";

        public ImageController(IImageService imageService, ServisProDbContext context)
        {
            _imageService = imageService;
            _context = context;
        }

        // POST: api/Image/upload
        // Ovaj endpoint je tipično potreban za REGISTRACIJU (pre login-a) da dobiješ url + publicId.
        // Zato ga stavljamo na AllowAnonymous.
        [HttpPost("upload")]
        [AllowAnonymous]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Slika nije poslata.");

            // osnovna zaštita od spama / prevelikih fajlova
            if (file.Length > 3 * 1024 * 1024)
                return BadRequest("Slika je prevelika (max 3MB).");

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType))
                return BadRequest("Nedozvoljen format slike. Dozvoljeno: JPG, PNG, WEBP.");

            var result = await _imageService.UploadImageAsync(file);
            if (result == null)
                return BadRequest("Greska pri uploadu slike.");

            return Ok(new
            {
                url = result.Url,
                publicId = result.PublicId,
            });
        }

        // POST: api/Image/profile
        // Ovo je za ULOGOVANE korisnike koji menjaju sliku profila u aplikaciji.
        [HttpPost("profile")]
        [Authorize]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Slika nije poslata.");

            if (file.Length > 3 * 1024 * 1024)
                return BadRequest("Slika je prevelika (max 3MB).");

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType))
                return BadRequest("Nedozvoljen format slike. Dozvoljeno: JPG, PNG, WEBP.");

            var user = await GetCurrentUserWithProfileAsync();
            if (user == null)
                return Unauthorized();

            string? oldPublicId = null;

            if (user.Role == UserRole.Client && user.Client != null)
                oldPublicId = user.Client.ImagePublicId;

            if (user.Role == UserRole.Service && user.Service != null)
                oldPublicId = user.Service.ImagePublicId;

            if (!string.IsNullOrEmpty(oldPublicId))
                await _imageService.DeleteImageAsync(oldPublicId);

            var uploadResult = await _imageService.UploadImageAsync(file);
            if (uploadResult == null)
                return BadRequest("Greška pri uploadu slike.");

            if (user.Role == UserRole.Client && user.Client != null)
            {
                user.Client.ImagePublicId = uploadResult.PublicId;
                user.Client.ImageUrl = uploadResult.Url;
            }
            else if (user.Role == UserRole.Service && user.Service != null)
            {
                user.Service.ImagePublicId = uploadResult.PublicId;
                user.Service.ImageUrl = uploadResult.Url;
            }
            else
            {
                return BadRequest("Korisnik nema profil (Client/Service) za dodelu slike.");
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                url = uploadResult.Url,
                publicId = uploadResult.PublicId,
            });
        }

        // DELETE: api/Image/profile
        [HttpDelete("profile")]
        [Authorize]
        public async Task<IActionResult> DeleteProfileImage()
        {
            var user = await GetCurrentUserWithProfileAsync();
            if (user == null)
                return Unauthorized();

            // SERVICE USER
            if (user.Role == UserRole.Service && user.Service != null)
            {
                if (!string.IsNullOrWhiteSpace(user.Service.ImagePublicId))
                {
                    await _imageService.DeleteImageAsync(user.Service.ImagePublicId);
                }

                user.Service.ImagePublicId = null;
                user.Service.ImageUrl = DefaultServiceImageUrl;

                await _context.SaveChangesAsync();
                return NoContent();
            }

            // CLIENT USER
            if (user.Role == UserRole.Client && user.Client != null)
            {
                if (!string.IsNullOrWhiteSpace(user.Client.ImagePublicId))
                {
                    await _imageService.DeleteImageAsync(user.Client.ImagePublicId);
                }

                user.Client.ImagePublicId = null;
                user.Client.ImageUrl = DefaultClientImageUrl;

                await _context.SaveChangesAsync();
                return NoContent();
            }

            return BadRequest("Korisnik nema profil za brisanje slike.");
        }

        private async Task<User?> GetCurrentUserWithProfileAsync()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return null;

            if (!int.TryParse(userIdClaim, out var userId))
                return null;

            return await _context.Users
                .Include(u => u.Client)
                .Include(u => u.Service)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }
    }
}
