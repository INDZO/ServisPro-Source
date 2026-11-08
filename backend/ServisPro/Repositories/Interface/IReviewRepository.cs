using ServisPro.Models.Domain;
using ServisPro.Models.DTO;

public interface IReviewRepository
{
    Task<Review?> AddReviewAsync(ReviewPostDTO rvw, int userId);
    Task<bool> DoesReviewExists(int userId, int serviceId);
    Task<Review?> GetReviewByIdAsync(int reviewId);
    Task<Review> UpdateReviewAsync(Review review);
    Task<bool> DeleteReviewAsync(int reviewId);
    Task<Review?> GetMyReviewForServiceAsync(int userId, int serviceId);
}
