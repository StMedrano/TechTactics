# TechTactics Web Growth Agent

A human-approved local website-sales pipeline for TechTactics.

The application discovers local businesses with an OpenStreetMap-first scouting flow, can optionally use Gemini grounded Google Search when OSM is sparse, records discovery sources, audits existing websites using deterministic checks, scores opportunities with visible evidence, generates personalized sales assets with Gemini, builds private static demo pages, and tracks leads through a simple pipeline.

## Safety and operating principle

**No outreach is sent automatically.** The application creates drafts and artifacts for human review. It does not bulk email, text, call, or impersonate a human.

## Quick start

```bash
cd web-growth-agent
cp .env.example .env
npm install
npm test
npm run typecheck
npm run wga -- seed
npm run wga -- report
npm run wga -- serve
```

Then open `http://localhost:4317`.

For live scouting:

```bash
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician --source auto
npm run wga -- audit --all
npm run wga -- qualify --min-score 35
npm run wga -- report
```

For one approved prospect:

```bash
npm run wga -- generate --lead <lead-id>
```

## Pipeline

`NEW → AUDITED → QUALIFIED → DEMO_READY → APPROVED → CONTACTED → RESPONDED → PROPOSAL → WON/LOST`

The approval boundary is intentional. Generated outreach remains a draft until a person moves the lead to `approved`.

## Configuration

See `.env.example`.

- `GEMINI_MODEL=gemini-3.5-flash-lite` handles summaries, outreach drafts, proposals, demo copy, and Zoho orchestration.
- `WGA_SCOUT_MODEL=gemini-3.5-flash-lite` is used only when Gemini web scouting is attempted.
- `WGA_SCOUT_SOURCE=auto` tries OpenStreetMap first and only attempts Gemini when OSM returns no leads.
- `WGA_OSM_RADIUS_METERS=25000` controls the radius around the requested market.
- `WGA_NOMINATIM_URL` resolves the market to coordinates for radius-based OSM discovery.

A Gemini `429 RESOURCE_EXHAUSTED` error is treated as a quota condition and does not crash the scout. No Google Maps/Places API key is required.

A missing website during discovery is recorded as "not found during discovery," not as proof that the business has no website. The deterministic auditor verifies any discovered website before website-specific claims are used.

## Mobile dashboard

The dashboard renders the full pipeline table on larger screens and switches to dedicated lead cards below 760px. Mobile cards surface the business, score, stage, evidence, website link, and full-width actions without forcing horizontal table scrolling.

## Zoho Mail MCP

The agent can use Zoho Mail through Zoho's MCP server while keeping outbound customer email behind the existing human approval gate.

1. In Zoho MCP, create a server that includes Zoho Mail.
2. Enable only the mail tools this project uses: getMailAccounts, getAccountDetails, listEmails, SearchEmails, getMessageContent, getMessageAttachmentInfo, sendEmail, and sendReplyMail.
3. For a server/headless deployment, use Zoho's shared connection authorization mode so the runtime does not need an interactive login on every call.
4. Store the generated server URL in `ZOHO_MCP_URL`. Treat this URL like a password and never commit it.
5. Configure any internal role addresses with `WGA_MANAGER_EMAIL`, `WGA_SCOUT_EMAIL`, `WGA_AUDITOR_EMAIL`, `WGA_DESIGNER_EMAIL`, `WGA_SALES_EMAIL`, `WGA_ACCOUNTING_EMAIL`, and `WGA_LEGAL_EMAIL`.

Connection test:

```bash
npm run wga -- zoho-status
```

Read/search mail without mutation:

```bash
npm run wga -- mail-read --task "Find unread replies from website prospects and summarize the requests."
```

Set a lead email when one was not discovered from a mailto link:

```bash
npm run wga -- contact-email --lead <lead-id> --email owner@example.com
```

Customer outreach remains two-step. First approve the demo-ready lead, then explicitly send:

```bash
npm run wga -- approve --lead <lead-id>
npm run wga -- send --lead <lead-id>
```

For a reviewed reply to an existing Zoho message:

```bash
npm run wga -- mail-reply --message-id <zoho-message-id> --body "Thanks for getting back to us..."
```

Internal role-to-role email is explicit and restricted to configured role addresses:

```bash
npm run wga -- agent-mail --from sales --to manager --subject "Prospect replied" --body "Please review the latest response."
```

Read-only mail access never receives a send/reply tool. The customer send path requires the lead to be approved, have a reviewed outreach draft, and have a valid contact email. Initial customer sends are reserved durably before Zoho is called and duplicate initial sends are blocked. If a process/provider failure leaves a send ambiguous, check the Zoho Sent folder and run `reconcile-send --lead <id> --result sent|not-sent` before any retry.

## Accounting / Tax and Legal assistants

The internal role network also includes `accounting` and `legal`.

Accounting/Tax uses a separate Zoho Books MCP server configured with `ZOHO_BOOKS_MCP_URL`. The application requires an explicit comma-separated allow-list of **read-only** tool names in `WGA_ZOHO_BOOKS_READ_TOOLS`; it intentionally does not guess tool names or expose the whole Books server.

```bash
npm run wga -- books-status
npm run wga -- books-read --task "Summarize this month's revenue, major expense categories, and unpaid invoices."
```

The Accounting/Tax assistant can prepare bookkeeping reviews, close checklists, and tax-prep packets, but does not file returns, make tax elections, initiate payments/transfers, or change the books automatically.

The Legal assistant is an internal drafting/review/issue-spotting role. It can summarize contracts, surface obligations/deadlines, prepare first drafts and attorney briefing questions, and coordinate through internal Zoho Mail. It cannot sign, accept terms, settle disputes, or make binding legal decisions.

## Packages used by the sales agent

- **Launch**: small brochure site / first website
- **Growth**: stronger local-service site with lead capture
- **Pro**: advanced functionality, integrations, or booking

Pricing is configurable in `src/packages.ts` and should be reviewed by TechTactics before sending any proposal.

## Architecture

- `src/scout.ts` — local business discovery and quota-safe fallbacks
- `src/audit.ts` — deterministic site inspection
- `src/score.ts` — transparent opportunity scoring
- `src/ai.ts` — Gemini sales asset generation
- `src/site.ts` — private static demo generator
- `src/store.ts` — JSON persistence
- `src/pipeline.ts` — workflow orchestration
- `src/server.ts` — responsive dashboard/API
- `src/cli.ts` — operator commands
- `agents/` — operating instructions for specialized agents
