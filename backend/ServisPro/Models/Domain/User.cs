namespace ServisPro.Models.Domain
{
    public enum UserRole
    {
        Client = 0,
        Service =1,
        Admin = 2
    }
    public class User
    {
        public int Id { get; set; }

        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;

        public UserRole Role { get; set; }

        public bool IsApproved { get; set; }

        public Client? Client { get; set; }
        public Service? Service { get; set; }
    }
}
