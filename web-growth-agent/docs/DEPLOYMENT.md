# Deployment

V1 is designed to run as a private TechTactics operations tool.

## Recommended homelab deployment
- Node.js 20+ inside Docker
- Persistent volumes for `data/` and `artifacts/`
- Secrets supplied with an untracked `.env` file
- `WGA_HOST=0.0.0.0` only inside the container
- Dashboard exposed through the homelab reverse proxy and protected with authentication

## Gemini model routing

The Web Growth Agent uses Google's `@google/genai` SDK. Configure:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
WGA_SCOUT_MODEL=gemini-3.5-flash-lite
```

`GEMINI_MODEL` handles routine AI tasks such as sales assets, summaries, and Zoho orchestration.

`WGA_SCOUT_MODEL` is used only when Gemini web scouting is attempted. The default `auto` discovery mode is intentionally OpenStreetMap-first so normal scouting can continue even when Gemini search quota is unavailable.

For discovery:

```env
WGA_SCOUT_SOURCE=auto
WGA_OVERPASS_URL=https://overpass-api.de/api/interpreter
WGA_NOMINATIM_URL=https://nominatim.openstreetmap.org/search
WGA_OSM_RADIUS_METERS=25000
```

`auto` resolves the requested market to coordinates, queries OpenStreetMap within the configured radius, and only attempts Gemini web search if OSM returns no leads. A Gemini `429 RESOURCE_EXHAUSTED` condition is treated as a quota condition and does not crash the scouting command.

No Google Maps/Places API key is required.

If no Gemini key is configured, deterministic fallback sales assets remain available and OSM scouting still works for supported categories.

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

## Mobile dashboard

The dashboard keeps the full desktop table on larger screens and switches to dedicated lead cards below 760px. Mobile cards use readable evidence sections and full-width action buttons instead of forcing a wide table to scroll horizontally.

## Persistent state
The Compose deployment mounts:
- `./data:/app/data`
- `./artifacts:/app/artifacts`

Back up both locations before destructive upgrades.

## Production upgrade path
Replace JSON persistence with PostgreSQL/Supabase, add authenticated users/roles, move static demos to private preview hosting, and add tighter application-level authentication/authorization.

## Zoho Mail secret
Store `ZOHO_MCP_URL` in the deployment secret manager or untracked environment file, never in Git. Put authentication in front of any reverse proxy before exposing approved-send functionality.
