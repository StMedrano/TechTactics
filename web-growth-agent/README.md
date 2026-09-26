# TechTactics Web Growth Agent

A human-approved local website-sales pipeline for TechTactics.

The application discovers local businesses with OpenStreetMap and optional Gemini grounded web search, audits existing websites using deterministic checks, scores opportunities with visible evidence, generates personalized sales assets with Gemini, builds private static demo pages, and tracks leads through the TechTactics Web Growth Command Center.

## Safety and operating principle

**No outreach is sent automatically.** The application creates drafts and artifacts for human review. Approve and Send are separate explicit actions.

## Quick start

```bash
cd web-growth-agent
cp .env.example .env
npm install
npm test
npm run typecheck
npm run wga -- serve
```

Then open `http://localhost:4317`.

For live scouting:

```bash
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician --max-results 10 --source auto
npm run wga -- audit --all
npm run wga -- qualify --min-score 35
npm run wga -- report
```

Synthetic demo leads are optional. If they were previously seeded into a production store, remove only those fixtures with:

```bash
npm run wga -- purge-fixtures
```

## Pipeline

`NEW → AUDITED → QUALIFIED → DEMO_READY → APPROVED → CONTACTED → RESPONDED → PROPOSAL → WON/LOST`

The approval boundary is intentional. Generated outreach remains a draft until a person approves the lead, and sending remains a separate explicit action.

## Discovery configuration

See `.env.example`.

- `GEMINI_MODEL=gemini-3.5-flash-lite` handles routine AI work such as summaries, proposals, demo copy, and Zoho orchestration.
- `WGA_SCOUT_MODEL=gemini-3.5-flash-lite` handles optional Gemini web scouting.
- `WGA_SCOUT_SOURCE=auto` queries OpenStreetMap first. If OSM returns fewer than the requested result count, Gemini can supplement the remaining slots.
- `WGA_OVERPASS_URLS` is a comma-separated endpoint pool. A 504 or other endpoint failure advances to the next configured Overpass server.
- `WGA_OSM_RADIUS_METERS=25000` controls the OSM search radius; 40 km can be useful around Prairieville/Baton Rouge/Gonzales.
- `WGA_NOMINATIM_URL` resolves the requested market to coordinates.

A Gemini `429 RESOURCE_EXHAUSTED` condition never discards useful OSM results already found. No Google Maps/Places API key is required.

OSM records carrying explicit brand/network tags are excluded from local-independent prospecting. Gemini instructions also exclude national chains, franchises, distributors, big-box retailers, and businesses that do not actually perform the requested service.

A missing website during discovery means only that a website was not identified by that discovery source. The deterministic auditor verifies any discovered site before website-specific claims are used.

## Web Growth Command Center

The server-rendered operations UI follows the approved TechTactics command-center structure:

- Overview
- Pipeline
- Leads
- Agents
- Inbox
- Accounting
- Legal
- Integrations

The operating rail is `Find → Audit → Demo → Approve → Contact → Close`. KPI cards, pipeline counts, a top-opportunity workspace, Agent Operations, Integration Health, and the lead workspace share one responsive surface.

On screens below 760px, the desktop lead table is replaced by stacked lead cards with score, stage, evidence, website link, and full-width actions.

## Zoho Mail MCP

The agent can use Zoho Mail through Zoho's MCP server while keeping outbound customer email behind the human approval gate.

1. In Zoho MCP, create a server that includes Zoho Mail.
2. Enable only the mail tools this project uses: getMailAccounts, getAccountDetails, listEmails, SearchEmails, getMessageContent, getMessageAttachmentInfo, sendEmail, and sendReplyMail.
3. For a server/headless deployment, use Zoho's shared connection authorization mode.
4. Store the generated server URL in `ZOHO_MCP_URL`. Treat it like a password and never commit it.
5. Configure role addresses with `WGA_MANAGER_EMAIL`, `WGA_SCOUT_EMAIL`, `WGA_AUDITOR_EMAIL`, `WGA_DESIGNER_EMAIL`, `WGA_SALES_EMAIL`, `WGA_ACCOUNTING_EMAIL`, and `WGA_LEGAL_EMAIL` as needed.

Connection test:

```bash
npm run wga -- zoho-status
```

Customer outreach remains two-step:

```bash
npm run wga -- approve --lead <lead-id>
npm run wga -- send --lead <lead-id>
```

## Accounting / Tax and Legal assistants

Accounting/Tax uses a separate Zoho Books MCP server configured with `ZOHO_BOOKS_MCP_URL` and an explicit read-only tool allow-list in `WGA_ZOHO_BOOKS_READ_TOOLS`.

```bash
npm run wga -- books-status
npm run wga -- books-read --task "Summarize this month's revenue, major expense categories, and unpaid invoices."
```

The Accounting/Tax assistant prepares reviews and tax-prep material but does not file returns, make elections, initiate payments/transfers, or change the books automatically. The Legal assistant supports drafting, summaries, issue spotting, and owner review but cannot sign, accept terms, settle disputes, or make binding legal decisions.

## Architecture

- `src/scout.ts` — resilient local business discovery and source merging
- `src/audit.ts` — deterministic site inspection
- `src/score.ts` — transparent opportunity scoring
- `src/ai.ts` — Gemini sales asset generation
- `src/site.ts` — private static demo generator
- `src/store.ts` — JSON persistence
- `src/pipeline.ts` — workflow orchestration
- `src/server.ts` — Web Growth Command Center/API
- `src/cli.ts` — operator commands
- `agents/` — operating instructions for specialized agents
