namespace ServisPro.Models.Config
{
    public class JwtSettings
    {
        public string SecretKey { get; set; } = null!;
        public int ClientMinutes { get; set; }
        public int AdminMinutes { get; set; }
        public int ServiceHours { get; set; }
    }
}
