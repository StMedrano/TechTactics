# TechTactics Twilio AI Receptionist — Zoho Catalyst AppSail

This is a Zoho Catalyst AppSail Node/Express app that answers inbound Twilio calls for TechTactics, captures caller intent, classifies the request, and stores a receptionist lead in Catalyst Data Store.

## Features

- Twilio Voice webhook endpoints
- Speech and keypad collection using TwiML Gather
- Emergency call forwarding
- OpenAI-powered classification with a keyword fallback
- Customer voice intake that creates/updates portal customer records without collecting passwords
- Pending approval service ticket creation for admin quote review
- Zoho Books customer contact creation through a Catalyst connection
- Catalyst Data Store integration through `zcatalyst-sdk-node`
- Local memory fallback for development
- `/admin/leads` JSON endpoint for viewing captured calls

## Folder Structure

```text
src/server.js                 Express/AppSail entry point
src/routes/voice.routes.js    Twilio call flow
src/routes/admin.routes.js    Lead list endpoint
src/services/ai.service.js    OpenAI/fallback classifier
src/services/catalyst.service.js Catalyst Data Store save/list
src/middleware/twilio.middleware.js Twilio signature validation
config/datastore-schema.md    Catalyst table schema
```

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Test:

```bash
curl http://localhost:3000/health
```

For local Twilio testing, keep this in `.env`:

```env
SKIP_TWILIO_VALIDATION=true
USE_MEMORY_STORE=true
```

Use ngrok or another tunnel and set Twilio's Voice webhook to:

```text
https://your-ngrok-url.ngrok-free.app/voice/incoming
```

## Catalyst AppSail Setup

1. Install the Catalyst CLI.
2. Log in and initialize/select your Catalyst project.
3. Create the `ReceptionistLeads` table using `config/datastore-schema.md`.
4. Configure AppSail environment variables:
   - `TWILIO_AUTH_TOKEN`
   - `PUBLIC_BASE_URL`
   - `OPENAI_API_KEY` optional
   - `TWILIO_VOICE` optional, defaults to `alice`
   - `TWILIO_LANGUAGE` optional
   - `EMERGENCY_FORWARD_NUMBER` optional
   - `CATALYST_LEADS_TABLE=ReceptionistLeads`
   - `CATALYST_TABLE_USERS=Users`
   - `CATALYST_TABLE_TICKETS=Tickets`
   - `ZOHO_BOOKS_CONNECTION_LINK_NAME=books`
   - `ZOHO_ORGANIZATION_ID`
5. Deploy the AppSail service.
6. Copy the deployed AppSail URL.
7. In Twilio Console, open the phone number and set **A call comes in** to:

```text
https://your-appsail-url/voice/incoming
```

Use HTTP POST.

## AppSail Port Requirement

The server listens on:

```js
process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 3000
```

This is required because Catalyst AppSail injects the runtime port through `X_ZOHO_CATALYST_LISTEN_PORT`.

## Twilio Routes

| Route | Method | Purpose |
|---|---:|---|
| `/voice/incoming` | POST | Starts the call and asks what the caller needs |
| `/voice/intent` | POST | Classifies install/repair/billing/emergency/general |
| `/voice/details` | POST | Captures name, address, and callback details |
| `/voice/no-input` | POST | Re-prompts caller |
| `/voice/finish` | POST | Ends call politely |
| `/admin/leads` | GET | Lists recent receptionist leads |

## Production Notes

- Set `SKIP_TWILIO_VALIDATION=false` or remove it in production.
- Make sure `PUBLIC_BASE_URL` exactly matches the public AppSail URL Twilio is calling.
- Put secrets in Catalyst environment variables, not in source code.
- Keep the Catalyst `books` connection authorized so phone-created customers can be created in Zoho Books.
- `OPENAI_API_KEY` is optional, but strongly improves name/email/address extraction from voice transcripts.
- If your TechTactics Portal stays in ASP.NET Core, this AppSail service can post leads to your portal API later using an internal API key.
