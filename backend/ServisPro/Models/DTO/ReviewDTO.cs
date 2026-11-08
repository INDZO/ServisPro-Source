using System.ComponentModel.DataAnnotations;

namespace ServisPro.Models.DTO
{
    public class ReviewPostDTO
    {
        public int ServiceId { get; set; }
        [Range(1, 5)]
        public int Rating { get; set; }
        public string? Comment { get; set; } 
    }

    public class ReviewUpdateDTO
    {
        [Range(1, 5)]
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public class ReviewDTO
    {
        public int Id { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime ReviewDate { get; set; }
        public int ClientId { get; set; }
        public int ServiceId { get; set; }
    }

}
