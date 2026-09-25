# Deployment

V1 is designed to run as a private TechTactics operations tool.

## Recommended homelab deployment
- Node.js 20+ inside Docker
- Persistent volumes for `data/` and `artifacts/`
- Secrets supplied with an untracked `.env` file
- `WGA_HOST=0.0.0.0` only inside the container
- Dashboard exposed through the homelab reverse proxy and protected with authentication

## Gemini
The Web Growth Agent uses Google's current `@google/genai` SDK. Configure:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

If no Gemini key is configured, the existing deterministic fallback sales assets remain available.

## Docker

```bash
cd web-growth-agent
cp .env.example .env
# edit .env and set WGA_HOST=0.0.0.0 plus required secrets

docker compose up -d --build
docker compose ps
docker compose logs -f web-growth-agent
```

The default Compose file publishes port `4317` for initial LAN verification. Once Nginx Proxy Manager shares a Docker network with the service, the host port can be removed and NPM can proxy directly to `web-growth-agent:4317`.

## Persistent state
The Compose deployment mounts:
- `./data:/app/data`
- `./artifacts:/app/artifacts`

Back up both locations before destructive upgrades.

## Production upgrade path
Replace JSON persistence with PostgreSQL/Supabase, add authenticated users/roles, move static demos to private preview hosting, and add tighter application-level authentication/authorization.

## Zoho Mail secret
Store `ZOHO_MCP_URL` in the deployment secret manager or untracked environment file, never in Git. Put authentication in front of any reverse proxy before exposing approved-send functionality.
