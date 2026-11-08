using Microsoft.EntityFrameworkCore;
using ServisPro.Data;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;

namespace ServisPro.Repositories.Implementation
{
    public class SQLReviewRepository : IReviewRepository
    {
        private readonly ServisProDbContext _context;
        public SQLReviewRepository(ServisProDbContext context)
        {
            _context = context;
        }

        public async Task<Review?> AddReviewAsync(ReviewPostDTO rvw, int userId)
        {

            var client = await _context.Clients.FirstOrDefaultAsync(c => c.UserId == userId);
            if (client == null) return null;


            var serviceExists = await _context.Services.AnyAsync(s => s.Id == rvw.ServiceId);
            if (!serviceExists) return null;

            var review = new Review
            {
                ServiceId = rvw.ServiceId,
                Rating = rvw.Rating,
                Comment = rvw.Comment ?? string.Empty,
                ReviewDate = DateTime.UtcNow,
                ClientId = client.Id
            };

            await _context.Reviews.AddAsync(review);
            await _context.SaveChangesAsync();


            return await _context.Reviews
                .Include(r => r.Client)
                .Include(r => r.Service)
                .FirstOrDefaultAsync(r => r.Id == review.Id);
        }

        public async Task<bool> DeleteReviewAsync(int reviewId)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null) return false;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Review?> GetReviewByIdAsync(int reviewId)
        {
            return await _context.Reviews
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)   
                .Include(r => r.Service)
                .FirstOrDefaultAsync(r => r.Id == reviewId);
        }

        public async Task<bool> DoesReviewExists(int userId, int serviceId)
        {
            return await _context.Reviews
                .AnyAsync(r => r.Client.UserId == userId && r.ServiceId == serviceId);
        }


        public async Task<Review> UpdateReviewAsync(Review review)
        {
            _context.Reviews.Update(review);
            await _context.SaveChangesAsync();

            return await _context.Reviews
                .Include(r => r.Client)
                    .ThenInclude(c => c.User)
                .Include(r => r.Service)
                .FirstAsync(r => r.Id == review.Id);
        }

        public async Task<Review?> GetMyReviewForServiceAsync(int userId, int serviceId)
        {
            return await _context.Reviews
                .Include(r => r.Client)
                .FirstOrDefaultAsync(r =>
                    r.ServiceId == serviceId &&
                    r.Client != null &&
                    r.Client.UserId == userId);
        }
    }
}
