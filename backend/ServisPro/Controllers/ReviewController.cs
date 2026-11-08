using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServisPro.Models.Domain;
using ServisPro.Models.DTO;
using ServisPro.Repositories.Interface;
using System.Security.Claims;

namespace ServisPro.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Client")]

    public class ReviewController : ControllerBase
    {
        private readonly IReviewRepository _reviewRepository;
        public ReviewController(IReviewRepository reviewRepository)
        {
            _reviewRepository = reviewRepository;
        }

        private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        // POST api/review
        [HttpPost]
        public async Task<ActionResult<ReviewDTO>> CreateReview([FromBody] ReviewPostDTO rvw)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);


            if (await _reviewRepository.DoesReviewExists(UserId, rvw.ServiceId))
            {
                return BadRequest("Review postoji za ovog klijenta i servis.");
            }

            var review = await _reviewRepository.AddReviewAsync(rvw, UserId);

            if (review == null) return BadRequest("Kreiranje bezuspesno");

            var dto = new ReviewDTO
            {
                Id = review.Id,
                Rating = review.Rating,
                Comment = review.Comment,
                ReviewDate = review.ReviewDate,
                ClientId = review.ClientId,
                ServiceId = review.ServiceId
            };

            return CreatedAtAction(nameof(GetReviewById), new { reviewId = dto.Id }, dto);
        }

        // GET api/review/{reviewId}
        [HttpGet("{reviewId}")]
        public async Task<ActionResult<ReviewDTO>> GetReviewById(int reviewId)
        {
            var review = await _reviewRepository.GetReviewByIdAsync(reviewId);
            if (review == null) return NotFound();

            var dto = new ReviewDTO
            {
                Id = review.Id,
                Rating = review.Rating,
                Comment = review.Comment,
                ReviewDate = review.ReviewDate,
                ClientId = review.ClientId,
                ServiceId = review.ServiceId
            };

            return Ok(dto);
        }

        // PUT api/review/{reviewId}
        [HttpPut("{reviewId}")]
        public async Task<ActionResult<ReviewDTO>> UpdateReview(int reviewId, [FromBody] ReviewUpdateDTO update)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _reviewRepository.GetReviewByIdAsync(reviewId);
            if (existing == null) return NotFound();

            if (existing.Client == null || existing.Client.UserId != UserId)
                return Forbid();

            existing.Rating = update.Rating;
            existing.Comment = update.Comment ?? string.Empty;
            existing.ReviewDate = DateTime.UtcNow;

            var updated = await _reviewRepository.UpdateReviewAsync(existing);

            var dto = new ReviewDTO
            {
                Id = updated.Id,
                Rating = updated.Rating,
                Comment = updated.Comment,
                ReviewDate = updated.ReviewDate,
                ClientId = updated.ClientId,
                ServiceId = updated.ServiceId
            };

            return Ok(dto);
        }

        // DELETE api/review/{reviewId}
        [HttpDelete("{reviewId}")]
        public async Task<ActionResult> DeleteReview(int reviewId)
        {
            var existing = await _reviewRepository.GetReviewByIdAsync(reviewId);
            if (existing == null) return NotFound();

            if (existing.Client == null || existing.Client.UserId != UserId)
                return Forbid();

            var result = await _reviewRepository.DeleteReviewAsync(reviewId);
            if (result) return NoContent();

            return StatusCode(500, "Brisanje bezuspesno.");
        }

        // GET api/review/mine/{serviceId}
        [HttpGet("mine/{serviceId:int}")]
        public async Task<ActionResult<ReviewDTO>> GetMine(int serviceId)
        {
            var review = await _reviewRepository.GetMyReviewForServiceAsync(UserId, serviceId);
            if (review == null) return NotFound();

            var dto = new ReviewDTO
            {
                Id = review.Id,
                Rating = review.Rating,
                Comment = review.Comment,
                ReviewDate = review.ReviewDate,
                ClientId = review.ClientId,
                ServiceId = review.ServiceId
            };

            return Ok(dto);
        }
    }
}
