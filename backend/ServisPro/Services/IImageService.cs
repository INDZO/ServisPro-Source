using Microsoft.AspNetCore.Http;

namespace ServisPro.Services
{
    public class ImageUploadResult
    {
        public string Url { get; set; } = null!;
        public string PublicId { get; set; } = null!;
    }
    public interface IImageService
    {
        Task<ImageUploadResult?> UploadImageAsync(IFormFile file);
        Task<bool> DeleteImageAsync(string publicId);
    }
}
