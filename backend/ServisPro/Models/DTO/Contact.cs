namespace ServisPro.Models.DTO
{
    public class ContactRequest
    {
        public string Email { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
    }
}
