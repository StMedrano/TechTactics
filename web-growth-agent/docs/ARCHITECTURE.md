# Architecture

## System loop
1. **Scout** calls Google Places Text Search using an explicit field mask.
2. **Store** deduplicates businesses using the provider place ID.
3. **Auditor** requests the business website and records deterministic evidence.
4. **Scorer** assigns points only to recorded evidence.
5. **Qualifier** promotes audited leads above the configured threshold.
6. **AI agent** creates a summary, outreach draft, proposal draft, and demo copy. If no OpenAI key exists, deterministic fallback assets keep the workflow testable.
7. **Site generator** writes a private static concept.
8. **Human approval** moves a reviewed lead to approved.
9. **Zoho Mail MCP** can read/search mail with read-only tools. An initial customer send is available only from the approved state and moves the lead to contacted only after Zoho reports a successful send.
10. **Dashboard/report** exposes the pipeline and projected build value.
11. Wins/losses can later feed category/market learning.

## Trust boundary
AI text is never considered audit evidence. The source-of-truth evidence is generated before the AI step and supplied to the model as a factual record.

## Persistence
V1 uses an intentionally simple JSON store so the workflow is portable. A production deployment can replace `LeadStore` with PostgreSQL/Supabase without changing the domain model.

## Command Center rendering

The Command Center remains dependency-light and server-rendered:

- `dashboard-model.ts` parses approved page paths and builds a deterministic view model from `Lead[]`.
- `dashboard-pages.ts` renders one focused workflow body at a time.
- `dashboard-shell.ts` owns the shared TechTactics chrome, responsive design system, desktop navigation, and mobile bottom navigation/More sheet.
- `dashboard.ts` composes the model, page, and shell while preserving the public `renderDashboard` export.
- `server.ts` maps real GET routes and leaves guarded mutations in the pipeline and communications modules.

Overview intentionally contains only four quick-look metrics, three next-best-work items, a compact pipeline snapshot, and integration configuration health. Detailed tables, controls, and evidence belong to dedicated pages.

Preview UI is capability-gated. The GitHub implementation exposes the existing guarded generation workflow. Uploaded-preview and restore-generated controls remain hidden until their production handlers are reconciled into the same branch.

## Command Center routes

- `/` — quick-look Overview
- `/leads` — lead search/list
- `/leads/:id` — focused lead workspace
- `/pipeline` — full server-controlled pipeline
- `/previews` — private website concepts
- `/agents`, `/inbox`, `/accounting`, `/legal` — operational areas
- `/integrations`, `/settings` — permission and non-secret configuration status

Legacy `/?lead=<id>` links redirect to the canonical lead workspace.

## Future integrations
- CRM/contact history
- Richer Zoho thread/contact synchronization
- Client intake and contracts
- Hosted private demo environments
- Payment/invoice integration
- Closed-loop conversion analytics

## Mail trust boundary
Inbound email is untrusted external content. Read/search workflows receive only read-only Zoho tools. Customer send/reply functions receive only the minimum mutation tool needed for the explicit action, and generated MCP URLs are configuration secrets rather than repository data.
