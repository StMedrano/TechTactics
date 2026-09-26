# Deployment

The Web Growth Agent is designed to run as a private TechTactics operations tool.

## Recommended homelab deployment
- Node.js 20+ inside Docker
- Persistent volumes for `data/` and `artifacts/`
- Secrets supplied with an untracked `.env` file
- `WGA_HOST=0.0.0.0` inside Docker
- Command Center exposed through the homelab reverse proxy and protected with authentication

## Gemini

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
WGA_SCOUT_MODEL=gemini-3.5-flash-lite
```

`GEMINI_MODEL` handles routine AI work. `WGA_SCOUT_MODEL` is used for optional Gemini lead discovery/supplementation.

## Lead discovery

```env
WGA_SCOUT_SOURCE=auto
WGA_OVERPASS_URLS=https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter
WGA_NOMINATIM_URL=https://nominatim.openstreetmap.org/search
WGA_OSM_RADIUS_METERS=25000
```

`auto` resolves the requested market to coordinates, tries configured Overpass endpoints in order, and uses Gemini to supplement the result set when OSM returns fewer than the requested number of prospects. If Gemini is quota-limited, OSM results already found are retained.

No Google Maps/Places API key is required.

Public OSM endpoints are shared infrastructure and should be treated as best-effort dependencies. The application identifies itself with a User-Agent, caches market coordinates in-process, and avoids requiring an individual Overpass endpoint to be available.

## Docker

```bash
cd web-growth-agent
cp .env.example .env
# edit .env and set WGA_HOST=0.0.0.0 plus required secrets

docker compose up -d --build
docker compose ps
docker compose logs -f web-growth-agent
```

The default Compose file publishes port `4317` for LAN verification. Once Nginx Proxy Manager shares a Docker network with the service, the host port can be removed and NPM can proxy directly to `web-growth-agent:4317`.

## Production data cleanup

The synthetic `seed` command is for testing only. If fixtures were loaded into a production store, clean them without deleting real leads:

```bash
npm run wga -- purge-fixtures
```

Inside Docker:

```bash
docker exec -it web-growth-agent node dist/src/cli.js purge-fixtures
```

## Web Growth Command Center

The deployed UI uses the approved TechTactics command-center structure with sidebar/navigation for Overview, Pipeline, Leads, Agents, Inbox, Accounting, Legal, and Integrations. The operating workflow is `Find → Audit → Demo → Approve → Contact → Close`.

Below 760px the desktop lead table is replaced by stacked lead cards with full-width actions, while the navigation becomes a compact horizontal strip.

## Persistent state
The Compose deployment mounts:
- `./data:/app/data`
- `./artifacts:/app/artifacts`

Back up both locations before destructive upgrades.

## Production upgrade path
Replace JSON persistence with PostgreSQL/Supabase, add authenticated users/roles, move static demos to private preview hosting, and add tighter application-level authentication/authorization. For sustained high-volume OSM use, add persistent geocode caching and/or operate suitable dedicated geospatial infrastructure instead of depending solely on public endpoints.

## Zoho Mail secret
Store `ZOHO_MCP_URL` in the deployment secret manager or untracked environment file, never in Git. Put authentication in front of any reverse proxy before exposing approved-send functionality.
