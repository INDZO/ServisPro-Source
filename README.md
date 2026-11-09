# ServisPro

**Full-stack auto-service booking · Independent Software Engineering project**

Customers can browse workshops, manage vehicles and request appointments. Workshop staff manage calendars, bookings and service history. Administrators review providers and maintain the catalogs used across roles.

[Engineering documentation ↗](https://github.com/INDZO/Softversko-Inzenjerstvo-2026) · [Architecture and setup](docs/architecture.md)

![ServisPro public release homepage](docs/homepage.jpg)

## Source layout

| Path | Contents |
| --- | --- |
| `frontend/` | React and Vite client, role-based pages, REST adapters and component tests. |
| `backend/ServisPro/` | ASP.NET Core REST API, JWT authentication, controllers, application services, EF Core models and repository implementations. |
| `docs/` | Architecture, local configuration, and a screenshot of the public release. |

## Booking demo mode

[Open the live frontend demo ↗](https://indzo-servispro-demo.vercel.app/)

**Interactive frontend demo · Fictional data · No live backend**

Browse sample workshops, filter services, and submit a sample appointment in the original React scheduler. Actions stay in browser memory and reset on refresh. This repository also contains the actual ASP.NET Core API and EF Core migrations.

To run the demo locally, run `npm ci`, `npm run build:demo`, and `npm run preview` in `frontend/`.

## Local development

Use Node.js 22 or later, npm, .NET 10 SDK, and a local SQL Server instance. Configure the API and apply migrations as described in [local setup](docs/architecture.md#local-setup). In `frontend`, run `npm ci` and `npm run dev`. Copy `frontend/.env.example` to `frontend/.env` only if you need to override the local API base.

The release includes actual frontend and backend code. Public artwork replaces original photos and portraits. SMTP and image uploads require developer-owned SMTP and Cloudinary configuration. This is an academic development release without production configuration or data.
