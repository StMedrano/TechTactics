# Deployment

V1 is designed to run as a private TechTactics operations tool.

## Recommended first deployment
- Node.js 20+
- Private VM/container
- Persistent volume mounted for `data/` and `artifacts/`
- Secrets injected as environment variables
- Dashboard bound to localhost and exposed only through your authenticated internal access layer

## Example
```bash
cd web-growth-agent
npm install
npm run build
OPENAI_API_KEY=... GOOGLE_PLACES_API_KEY=... ZOHO_MCP_URL=... npm start
```

The dashboard intentionally binds to `127.0.0.1`. If reverse-proxying it, add authentication at the proxy/access layer rather than changing the app to bind publicly without protection.

## Production upgrade path
Replace JSON persistence with PostgreSQL/Supabase, add authenticated users/roles, move static demos to private preview hosting, and add an approved CRM/email-draft integration.

## Zoho Mail secret
Store ZOHO_MCP_URL in the deployment secret manager or environment, never in Git. The dashboard remains localhost-only; put authentication in front of any reverse proxy before exposing the approved-send endpoint.
