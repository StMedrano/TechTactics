# WGA Command Center Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lead scouting resilient enough for production use and restore the approved TechTactics Web Growth Command Center UI instead of the simplified dashboard.

**Architecture:** Keep the existing Node/TypeScript server and JSON lead store. Improve scouting by failing over across multiple Overpass endpoints, supplementing sparse OSM results with Gemini in `auto` mode, and filtering obvious chain/network OSM records. Add an explicit fixture cleanup command. Replace the single-page simplified dashboard shell with the approved command-center information architecture while preserving the existing API and approval gates.

**Tech Stack:** Node.js 20+, TypeScript, Express, Vitest, Google GenAI, OpenStreetMap Overpass/Nominatim.

**Spec:** Approved TechTactics Web Growth Command Center direction from Sep 25 2026: sidebar navigation (Overview, Pipeline, Leads, Agents, Inbox, Accounting, Legal, Integrations), workflow `Find → Audit → Demo → Approve → Contact → Close`, KPI cards, pipeline visibility, lead workspace, responsive mobile behavior, and separate Approve/Send actions.

## Global Constraints

- No Google Maps/Places API key.
- No automatic customer outreach; Approve and Send remain separate explicit actions.
- Gemini quota errors must never erase usable OSM results.
- Public Nominatim use must remain low-volume and cached where practical.
- Existing `/api/leads`, `/api/report`, approval, send, and stage endpoints remain compatible.
- Mobile UI must not require horizontal scrolling for lead review/actions.

## Review Focus

- Overpass primary endpoint returns HTTP 504: alternate endpoint must be tried before abandoning OSM.
- OSM returns fewer leads than requested: `auto` mode may supplement from Gemini and must dedupe.
- Gemini returns 429 after OSM returned leads: keep OSM leads and return successfully.
- Synthetic fixture leads exist in the production JSON store: operator can remove only fixtures without deleting real leads.
- Obvious branded/network OSM records should not be accepted as local independent website-sales prospects.

---

### Task 1: Scout reliability and lead quality

**Files:**
- Modify: `web-growth-agent/src/config.ts`
- Modify: `web-growth-agent/src/scout.ts`
- Modify: `web-growth-agent/.env.example`
- Test: `web-growth-agent/tests/scout-resilience.test.ts`

**Interfaces:**
- Produces: `config.overpassUrls: string[]`, endpoint-failover search behavior, sparse-result supplement behavior, obvious-chain filtering.

- [ ] Add failing tests for endpoint failover, sparse OSM supplementation, Gemini-429 preservation, and branded/network OSM filtering.
- [ ] Run CI and confirm the new tests fail against current implementation.
- [ ] Implement multi-endpoint Overpass failover and `auto` merge/dedupe behavior.
- [ ] Add deterministic OSM chain/network filtering.
- [ ] Run full typecheck/tests/build and confirm green.

### Task 2: Production fixture cleanup

**Files:**
- Modify: `web-growth-agent/src/seed.ts`
- Modify: `web-growth-agent/src/cli.ts`
- Test: `web-growth-agent/tests/store.test.ts`

**Interfaces:**
- Produces: `removeFixtureLeads(store?: LeadStore): Promise<number>` and CLI command `purge-fixtures`.

- [ ] Add a failing test proving fixtures are removed while real leads remain.
- [ ] Implement `removeFixtureLeads` with `replaceAll` and wire `purge-fixtures` into CLI/help.
- [ ] Run typecheck/tests/build and confirm green.

### Task 3: Restore approved Web Growth Command Center UI

**Files:**
- Modify: `web-growth-agent/src/server.ts`
- Modify: `web-growth-agent/tests/server-mobile.test.ts`

**Interfaces:**
- Consumes existing lead/report data and existing mutation endpoints.
- Produces server-rendered command-center shell with sidebar, workflow rail, KPI/pipeline overview, lead workspace/cards, agent/integration summaries, and mobile navigation.

- [ ] Add failing render assertions for the approved navigation labels and workflow stages while preserving mobile lead-card assertions.
- [ ] Implement the approved command-center structure without changing mutation semantics.
- [ ] Run typecheck/tests/build and confirm green.

### Task 4: Documentation and release verification

**Files:**
- Modify: `web-growth-agent/README.md`
- Modify: `web-growth-agent/docs/OPERATIONS.md`
- Modify: `web-growth-agent/docs/DEPLOYMENT.md`

- [ ] Document Overpass endpoint list, sparse-result supplementation, `purge-fixtures`, and the restored command-center UI.
- [ ] Run fresh CI on the complete branch and verify install, typecheck, all tests, and build succeed.
- [ ] Merge only after the fresh verification is green.
