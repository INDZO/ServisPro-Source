# ServisPro architecture

The React client calls the ASP.NET Core REST API. Controllers delegate business operations to services and repositories. EF Core maps the data model to SQL Server. The API validates JWTs and checks access on protected routes.

```mermaid
flowchart LR
    Client[React client] --> API[REST controllers]
    API --> Services[Application services]
    Services --> EF[Repositories and EF Core]
    EF --> SQL[(SQL Server)]
```

Customers manage vehicles and request appointments; workshops manage availability, offerings and appointments; administrators review providers and maintain shared catalogs. The EF Core migrations and model snapshot describe the database relationships.

## Local setup

1. From the repository root, enter `backend/ServisPro`.
2. Set `ConnectionStrings__ServisProConnection` to a new, developer-owned SQL Server database and `JwtSettings__SecretKey` to a locally generated random key of at least 32 bytes. Keep the values out of Git.
3. Install the .NET 10 version of the EF CLI and run `dotnet ef database update`.
4. Run `dotnet run --launch-profile local`. The API listens on port 5080. Run the frontend separately on port 5173.
5. For SMTP or media uploads, set the corresponding `EmailSettings__` and `Cloudinary__` environment variables using developer-owned values.

