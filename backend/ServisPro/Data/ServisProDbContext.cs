using Microsoft.EntityFrameworkCore;
using ServisPro.Models.Domain;

namespace ServisPro.Data
{
    public class ServisProDbContext : DbContext
    {
        public ServisProDbContext(DbContextOptions<ServisProDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<ServiceType> ServiceTypes => Set<ServiceType>();
        public DbSet<ServiceServiceType> ServiceServiceTypes => Set<ServiceServiceType>();

        public DbSet<CarBrand> CarBrands => Set<CarBrand>();
        public DbSet<CarModel> CarModels => Set<CarModel>();
        public DbSet<Car> Cars => Set<Car>();

        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<CarHistory> CarHistories => Set<CarHistory>();

        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<Conversation> Conversations => Set<Conversation>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

        public DbSet<ClosedDays> ClosedDays => Set<ClosedDays>();

        public DbSet<EmailOTP> EmailOTPs => Set<EmailOTP>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // USER
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.Client)
                .WithOne(c => c.User)
                .HasForeignKey<Client>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Service)
                .WithOne(s => s.User)
                .HasForeignKey<Service>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Email OTP: User 1 - N EmailOTP
            modelBuilder.Entity<EmailOTP>()
                .HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CAR BRAND / MODEL / CAR
            modelBuilder.Entity<CarModel>()
                .HasOne(cm => cm.CarBrand)
                .WithMany(cb => cb.CarModels)
                .HasForeignKey(cm => cm.CarBrandId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Car>()
                .HasOne(c => c.CarBrand)
                .WithMany()
                .HasForeignKey(c => c.CarBrandId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Car>()
                .HasOne(c => c.CarModel)
                .WithMany(cm => cm.Cars)
                .HasForeignKey(c => c.CarModelId)
                .OnDelete(DeleteBehavior.Restrict); // da se izbegne multiple cascade path

            modelBuilder.Entity<Car>()
                .HasOne(c => c.Client)
                .WithMany(cl => cl.Cars)
                .HasForeignKey(c => c.ClientId)
                .OnDelete(DeleteBehavior.Cascade);

            // SERVICE <-> SERVICETYPE (many-to-many)
            modelBuilder.Entity<ServiceServiceType>()
                .HasKey(sst => new { sst.ServiceId, sst.ServiceTypeId });

            modelBuilder.Entity<ServiceServiceType>()
                .HasOne(sst => sst.Service)
                .WithMany(s => s.ServiceServiceTypes)
                .HasForeignKey(sst => sst.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ServiceServiceType>()
                .HasOne(sst => sst.ServiceType)
                .WithMany(st => st.ServiceServiceTypes)
                .HasForeignKey(sst => sst.ServiceTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            // APPOINTMENT & CAR HISTORY
            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.Car)
                .WithMany(c => c.Appointments)
                .HasForeignKey(a => a.CarId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.Client)
                .WithMany(c => c.Appointments)
                .HasForeignKey(a => a.ClientId)
                .OnDelete(DeleteBehavior.Restrict); // da ne postoji dupli cascade sa Client -> Cars -> Appointments

            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.Service)
                .WithMany(s => s.Appointments)
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict); // isto za Service

            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.ServiceType)
                .WithMany()
                .HasForeignKey(a => a.ServiceTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // 1:1 Appointment - CarHistory
            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.CarHistory)
                .WithOne(ch => ch.Appointment)
                .HasForeignKey<CarHistory>(ch => ch.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // CarHistory veze – pazimo na cascade da nema duplih puteva
            modelBuilder.Entity<CarHistory>()
                .HasOne(ch => ch.Car)
                .WithMany(c => c.CarHistories)
                .HasForeignKey(ch => ch.CarId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CarHistory>()
                .HasOne(ch => ch.Service)
                .WithMany(s => s.CarHistories)
                .HasForeignKey(ch => ch.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CarHistory>()
                .HasOne(ch => ch.ServiceType)
                .WithMany()
                .HasForeignKey(ch => ch.ServiceTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // CONVERSATIONS
            modelBuilder.Entity<Conversation>()
                .HasOne(conv => conv.Client)
                .WithMany(c => c.Conversations)
                .HasForeignKey(conv => conv.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Conversation>()
                .HasOne(conv => conv.Service)
                .WithMany(s => s.Conversations)
                .HasForeignKey(conv => conv.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // REVIEWS
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Client)
                .WithMany(c => c.Reviews)
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Service)
                .WithMany(s => s.Reviews)
                .HasForeignKey(r => r.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // CHAT MESSAGES
            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // CLOSED DAYS

            modelBuilder.Entity<ClosedDays>()
                .HasOne(cd => cd.Service)
                .WithMany(s => s.ClosedDays)
                .HasForeignKey(cd => cd.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
