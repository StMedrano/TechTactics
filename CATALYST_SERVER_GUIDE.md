# TechTactics Portal - Zoho Catalyst server-side guide

This package keeps the existing client and ASP.NET sample server, but now includes a Catalyst-ready Node server in `server-catalyst/` that is wired for Zoho Catalyst Data Store, AppSail, and Zoho Books.

## What is included

- `client/` - React front end prepared for Catalyst Web Client Hosting
- `server/TechTactics.Api/` - original ASP.NET reference server
- `server-catalyst/` - Node/AppSail server for Catalyst deployment
- `server-catalyst/.env.example` - server environment placeholders

## Recommended architecture

Use this split inside one Catalyst project:

1. React client in Web Client Hosting
2. Node server in AppSail
3. Catalyst Data Store as the source of truth for users, services, tickets, invoices, payments, and settings
4. Zoho Books for contacts, invoices, and hosted payment links

## Server modes

- `APP_MODE=demo` - local in-memory data for testing
- `APP_MODE=catalyst` - real Catalyst-backed tables and Zoho Books integration

## Step 1: prepare Zoho Catalyst

Create these Data Store tables:

- `Users`
- `Services`
- `Tickets`
- `TimeEntries`
- `Payments`
- `Invoices`
- `Settings`

Recommended minimum columns:

### Users
- `ROWID`
- `email`
- `name`
- `role`
- `password_hash`
- `phone`
- `is_active`
- `zoho_contact_id`

Helpful optional columns:

- `address`
- `directory_groups`
- `directory_department`
- `first_name`
- `last_name`
- `pay_type`
- `hourly_rate`
- `annual_salary`
- `weekly_hours`
- `is_clocked_in`
- `max_active_jobs`

### Services
- `ROWID`
- `customer_id`
- `service_name`
- `category`
- `status`
- `started_at`
- `monthly_price`

### Tickets
- `ROWID`
- `customer_id`
- `employee_id`
- `service_type`
- `category`
- `title`
- `address`
- `description`
- `required_notes`
- `status`
- `created_at`
- `updated_at`

### Payments
- `ROWID`
- `employee_id`
- `period`
- `gross`
- `net`
- `status`

### TimeEntries
- `ROWID`
- `employee_id`
- `role_key`
- `started_at`
- `ended_at`
- `is_active`
- `total_miles`

Helpful optional TimeEntries columns:

- `last_latitude`
- `last_longitude`
- `path_json`
- `created_at`
- `updated_at`

Supported aliases if your table already uses them:

- `clock_in_at` for `started_at`
- `clock_out_at` for `ended_at`
- `active` for `is_active`
- `mileage_miles` for `total_miles`
- `gps_path` for `path_json`

### Invoices
- `ROWID`
- `ticket_id`
- `customer_id`
- `zoho_invoice_id`
- `invoice_number`
- `status`
- `total`
- `balance`
- `payment_url`
- `description`

### Settings
- `ROWID`
- `key1`
- `value_json`

Recommended settings entries:

- `directory_role_mappings`
- `zoho_refresh_token`

## Step 2: configure secrets

Copy `server-catalyst/.env.example` to `.env` and fill in:

- `APP_MODE`
- `CLIENT_ORIGIN`
- `SESSION_SECRET`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REDIRECT_URI`
- `ZOHO_ORGANIZATION_ID`

Production notes:

- In deployed AppSail, the Catalyst SDK uses the request context provided by Catalyst.
- Your `Users` table should include `email`, `role`, `name`, `password_hash`, and `is_active`.
- `password_hash` can be plain text temporarily for bring-up, but production should use `pbkdf2$iterations$salt$hash`.

## Step 3: built-in server coverage

The current `server-catalyst/` implementation already includes:

- login and session restore from `Users`
- customer, employee, and admin dashboard APIs
- services reads from `Services`
- ticket reads and inserts in `Tickets`
- invoice reads and Zoho invoice persistence in `Invoices`
- paycheck reads from `Payments`
- settings persistence in `Settings`
- profile updates and employee clock status updates in `Users`
- Zoho Directory group-to-role mapping using `directory_groups` and `directory_department`

## Step 4: Option A role mapping model

This app now supports keeping Catalyst `Users` as the source of app users while allowing Zoho Directory groups to override app roles.

How it works:

1. Keep a user row in Catalyst `Users`
2. Store the user's Zoho Directory groups in `directory_groups`
3. Optionally store their department in `directory_department`
4. Save a settings record named `directory_role_mappings`
5. On each authenticated request, the server resolves the effective app role from the Directory groups first, then falls back to the stored `role`

Example `directory_role_mappings` value:

```json
{
  "TechTactics Admins": "admin",
  "TechTactics Employees": "employee",
  "TechTactics Customers": "customer"
}
```

Example `directory_groups` values:

- JSON array: `["TechTactics Employees","Field Team"]`
- comma-separated string: `TechTactics Employees, Field Team`

## Step 5: Zoho Directory OpenID custom app

Use this when adding TechTactics Portal as a custom app in Zoho Directory using OpenID Connect.

### Zoho Directory app fields

In Zoho Directory, create a custom app with:

- Sign-In Type: `Open ID`
- Application Type: `Regular Web Application`
- Sign-in URL: `https://portal.mytechtactics.com/app/directory-login.html`
- Sign-out URL: `https://portal.mytechtactics.com/app/#/login`
- Redirect URL / Callback URL: `https://portalappsail-10124080596.development.catalystappsail.com/api/auth/directory/callback`

After saving the app, open its Single Sign-on details and copy Zoho Directory's Client ID, Client Secret, Authorization Endpoint, Token Endpoint, and User Info Endpoint into AppSail environment variables.

### AppSail environment variables

Set these in the Portal AppSail environment:

```env
CLIENT_APP_URL=https://portal.mytechtactics.com/app
ZOHO_DIRECTORY_CLIENT_ID=<copy from Zoho Directory custom app>
ZOHO_DIRECTORY_CLIENT_SECRET=<copy from Zoho Directory custom app>
ZOHO_DIRECTORY_AUTH_URL=<Authorization Endpoint from Zoho Directory>
ZOHO_DIRECTORY_TOKEN_URL=<Token Endpoint from Zoho Directory>
ZOHO_DIRECTORY_USERINFO_URL=<User Info Endpoint from Zoho Directory>
ZOHO_DIRECTORY_REDIRECT_URI=https://portalappsail-10124080596.development.catalystappsail.com/api/auth/directory/callback
ZOHO_DIRECTORY_SCOPE=openid email profile
```

Keep `ZOHO_DIRECTORY_CONNECTION_LINK_NAME=directory` and `ZOHO_DIRECTORY_ORG_ID` set if you also want Directory group lookups for role mapping.

Important: assign the custom app to yourself and any portal users/groups inside Zoho Directory before testing the app tile.

## Step 6: Zoho Books flow

The server includes endpoints for:

- building the authorize URL
- exchanging an authorization code
- refreshing an access token from the stored refresh token
- listing invoices from Zoho Books
- creating invoices in Zoho Books
- reading hosted payment links

Refresh tokens are stored server-side in `Settings`.

## Step 7: switch from demo to Catalyst

1. Finish `.env`
2. Set `APP_MODE=catalyst`
3. Populate your Catalyst tables
4. Make sure at least one admin user exists in `Users`
5. Connect Zoho once from the admin portal
6. Test customer, employee, and admin roles

## Step 8: deploy in Catalyst

Deploy two artifacts inside the same Catalyst project.

### Web Client Hosting

Upload:

- [techtactics-catalyst-client-upload.zip](C:/Users/medra/Downloads/TechTactics_Catalyst_Ready_Package/client/techtactics-catalyst-client-upload.zip)

Client environment:

- `VITE_BACKEND_API_BASE_URL=<your AppSail URL>/api`

### AppSail

Upload:

- [techtactics-catalyst-appsail-upload.zip](C:/Users/medra/Downloads/TechTactics_Catalyst_Ready_Package/server-catalyst/techtactics-catalyst-appsail-upload.zip)

Recommended AppSail configuration:

- install command: `pnpm install`
- start command: `pnpm start`
- `APP_MODE=catalyst`
- `NODE_ENV=production`
- `CLIENT_ORIGIN=<your Catalyst web client URL>`
- `SESSION_SECRET=<strong random secret>`
- `ZOHO_CLIENT_ID=<your Zoho client id>`
- `ZOHO_CLIENT_SECRET=<your Zoho client secret>`
- `ZOHO_REDIRECT_URI=<your Zoho callback URL>`
- `ZOHO_ORGANIZATION_ID=<your Zoho Books org id>`
- `PORTAL_MAIL_ENABLED=true`
- `PORTAL_MAIL_PROVIDER=auto`
- `PORTAL_EMAIL_FROM=portal@mytechtactics.com`
- `PORTAL_EMAIL_DISPLAY_NAME=TechTactics Portal`
- `PORTAL_EMAIL_REPLY_TO=portal@mytechtactics.com`
- `PORTAL_EMAIL_GROUP=portal@mytechtactics.com`
- `ZOHO_MAIL_HOST=smtp.zoho.com`
- `ZOHO_MAIL_PORT=465`
- `ZOHO_MAIL_SECURE=true`
- `ZOHO_MAIL_USER=<Zoho Mail mailbox with permission to send as portal@mytechtactics.com>`
- `ZOHO_MAIL_PASS=<Zoho Mail app password or SMTP password>`
- `ZOHO_MAIL_FROM=TechTactics Portal <portal@mytechtactics.com>`
- `DEVICE_PUSH_ENABLED=true`
- `WEB_PUSH_VAPID_SUBJECT=mailto:portal@mytechtactics.com`
- `WEB_PUSH_VAPID_PUBLIC_KEY=<generated VAPID public key>`
- `WEB_PUSH_VAPID_PRIVATE_KEY=<generated VAPID private key>`

Generate Web Push VAPID keys from `server-catalyst/` with:

```powershell
node -e "const webpush=require('web-push'); console.log(webpush.generateVAPIDKeys())"
```

## Step 8: local run order

### Client

- run the React client
- point `VITE_BACKEND_API_BASE_URL` to `http://localhost:4000/api`

### Server

- use `server-catalyst/`
- install dependencies
- start the server
- verify `/api/health`

## Step 9: migration checklist

- [ ] seed `Users`
- [ ] seed `Services`
- [ ] seed `Tickets`
- [ ] seed `Invoices`
- [ ] seed `Payments`
- [ ] hash passwords for production users
- [ ] populate `directory_groups` or `directory_department` for users who should inherit Zoho Directory rights
- [ ] add `directory_role_mappings` in `Settings`
- [ ] connect Zoho and store refresh token in `Settings`
- [ ] verify customer, employee, and admin flows
- [ ] verify hosted payment links

## Important notes

- The Catalyst version is now a working application path, not just a placeholder scaffold.
- The ASP.NET server is still in the repo as reference only.
- You should still add production hardening like stricter validation, rate limiting, and stronger admin workflows before going live.
