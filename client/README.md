# TechTactics React Client

This is the React front end for the TechTactics full-stack portal.

## Run locally

```bash
npm install
npm run dev
```

The local development default backend is `http://localhost:4000/api`.

## Environment variables

Copy `.env.example` to `.env` and update values if needed.

## Catalyst upload

For Catalyst Web Client Hosting, use the built `dist/` output or the pre-zipped upload package:

- [techtactics-catalyst-client-upload.zip](C:/Users/medra/Downloads/TechTactics_Catalyst_Ready_Package/client/techtactics-catalyst-client-upload.zip)

Production environment values can be based on:

- [`.env.production.example`](C:/Users/medra/Downloads/TechTactics_Catalyst_Ready_Package/client/.env.production.example)

Build command:

```bash
pnpm run build
```

Notes:

- The production build uses hash-based routing so direct page loads work in static hosting.
- `client-package.json` is included in the build output for Catalyst.
- Set `VITE_BACKEND_API_BASE_URL` to your deployed Catalyst/AppSail API URL before using Zoho-backed features.
