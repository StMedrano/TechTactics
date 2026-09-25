# TechTactics

## Current business focus: TechTactics Websites

TechTactics is currently being repositioned as a website-building company for local businesses. The public website should sell website audits, new websites, redesigns, lead-generation/booking flows, and business integrations.

The broader TechTactics vision is intentionally preserved for a later phase: MSP/IT services, smart-home services, and business technology installations can return as separate service divisions without rebuilding the platform from scratch.

See [WEBSITE_BUSINESS_PIVOT.md](WEBSITE_BUSINESS_PIVOT.md) for the current product, sales-agent, portal, and future-division architecture.

Customer, employee, and admin portal with Zoho Catalyst services for billing,
dispatch, time tracking, notifications, phone intake, and business automation.

## Repository Layout

- `client/`: React and Vite website, portal, and PWA assets.
- `server-catalyst/`: Node.js API deployed to Catalyst AppSail.
- `twilio-appsail/techtactics-catalyst-twilio-receptionist/`: Twilio receptionist AppSail.
- `agents-appsail/business-agents/`: Business automation agents AppSail.
- `server/TechTactics.Api/`: Original ASP.NET Core integration scaffold.

Each Node.js app has its own `package.json` and lockfile. Run `npm ci` in the
app's directory before using its scripts. Configure local environment values
from that app's `.env.example` file where provided; frontend hosting settings
are documented in `client/.env.production.example`. Set hosted environment
variables in Catalyst.

Local environment files, installed dependencies, generated builds, and deployment
ZIPs are excluded from Git. Keep credentials in local environment files or the
hosting provider's environment settings.

## Catalyst Setup

See [the Catalyst server guide](CATALYST_SERVER_GUIDE.md),
[the client guide](client/README.md),
[the receptionist guide](twilio-appsail/techtactics-catalyst-twilio-receptionist/README.md),
[the business agents guide](agents-appsail/business-agents/README.md), and
[the agent table definitions](AGENTS_APPSAIL_TABLES.md).

The root `catalyst.json` currently targets the business agents AppSail.

## Original Package Notes

This bundle now includes a Zoho Catalyst-ready server scaffold in `server-catalyst/` plus `CATALYST_SERVER_GUIDE.md` with setup and migration instructions.

# TechTactics Full-Stack Portal

This package includes:

- `client/` - React + Vite front end
- `server/TechTactics.Api/` - ASP.NET Core Web API for Zoho integration

## What is already wired

- Zoho OAuth authorize URL endpoint
- Zoho authorization code exchange endpoint
- Zoho refresh token endpoint
- Zoho contacts endpoint
- Zoho invoices list endpoint
- Zoho invoice creation endpoint
- Zoho invoice email endpoint
- Hosted payment link endpoint

## What you need to plug in

In the API project, set these values in `appsettings.json`, user secrets, or environment variables:

- `Zoho__ClientId`
- `Zoho__ClientSecret`
- `Zoho__OrganizationId`
- `Zoho__RedirectUri`

## Start the API

```bash
cd server/TechTactics.Api
# then run in Visual Studio or with dotnet run
```

Default local API URLs:
- `https://localhost:7067`
- `http://localhost:5067`

## Start the React app

```bash
cd client
npm install
npm run dev
```

Default local client URL:
- `http://localhost:5173`

## Recommended production setup

- Keep Zoho client secret only on the server
- Store refresh tokens server-side
- Replace browser-stored tokens with secure server session or database storage
- Add real authentication and role checks before exposing admin invoice tools
