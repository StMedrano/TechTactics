# Multipage Web Growth Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved multipage TechTactics Web Growth Command Center with a simplified overview and ergonomic mobile navigation while preserving all current workflow and safety behavior.

**Architecture:** Keep the existing Express and server-rendered HTML stack. Split the current monolithic dashboard renderer into a view model, focused page renderers, and one shared shell; map real URLs in `server.ts` and leave mutation logic in the existing pipeline/communications modules.

**Tech Stack:** TypeScript 5.9, Express 5, Vitest 3, server-rendered HTML/CSS/JavaScript

**Spec:** `docs/superpowers/specs/2026-09-29-multipage-command-center-design.md`

## Global Constraints

- Preserve the TechTactics palette: Pitch Black `#030407`, Deep Slate `#384358`, Gold `#F7AD4E`, and green only for healthy/success state.
- Preserve the real TechTactics logo and current brand transform compatibility.
- Keep `Approve Outreach` separate from `Send Through Zoho`.
- Do not bypass `setLeadStage` or the approved-send path.
- Keep Zoho Books read-only and Legal non-binding.
- Never render API keys, credentials, or secret values.
- Do not add React, a client router, a database migration, or a new production dependency.
- Do not remove production client helper names or preview endpoints when reconciling the live-only Designer/upload commits.
- All interactive mobile targets must be at least 44px where the 320px layout permits.
- Respect `prefers-reduced-motion` and avoid animation on frequent keyboard navigation.

## Review Focus

- Unknown URL or malformed lead id: render a useful 404 or lead-not-found state without exposing internals.
- Empty lead store: every page renders a truthful empty state and a valid next action.
- Long business/category/market values: wrap or truncate without overlapping actions at 320px.
- Missing preview capability: hide unavailable upload/restore actions instead of rendering dead controls.
- Approved lead without contact email: keep Zoho send disabled and explain the missing requirement.

---

### Task 1: Page and view-model contract

**Files:**
- Create: `src/dashboard-model.ts`
- Create: `tests/dashboard-model.test.ts`

**Interfaces:**
- Consumes: `Lead`, `LeadStage`, `buildReport(Lead[])`
- Produces: `DashboardPage`, `DashboardCapabilities`, `DashboardViewModel`, `parseDashboardPage(pathname: string): DashboardPage | undefined`, and `buildDashboardViewModel(leads: Lead[], selectedLeadId?: string, capabilities?: Partial<DashboardCapabilities>): DashboardViewModel`

- [ ] **Step 1: Write the failing page/model tests**

  Assert every approved path maps to the correct `DashboardPage`; unknown paths return `undefined`; empty leads produce zero metrics and empty work; priority work orders `demo_ready` before `qualified` before `audited`; missing preview capabilities default to false.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run tests/dashboard-model.test.ts`

  Expected: FAIL because `dashboard-model.ts` does not exist.

- [ ] **Step 3: Implement the typed page and view-model contract**

  Keep lead sorting deterministic (`updatedAt` descending after workflow priority) and cap Overview work at three items.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run: `npm test -- --run tests/dashboard-model.test.ts`

  Expected: all model tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/dashboard-model.ts tests/dashboard-model.test.ts
  git commit -m "Add command center page model"
  ```

### Task 2: Shared shell and navigation

**Files:**
- Create: `src/dashboard-shell.ts`
- Create: `tests/dashboard-shell.test.ts`
- Modify: `src/brand.ts`

**Interfaces:**
- Consumes: `DashboardPage`, `DashboardViewModel`
- Produces: `renderDashboardShell(model: DashboardViewModel, body: string): string`

- [ ] **Step 1: Write failing shell tests**

  Assert the shell contains real route links, exactly one active desktop link, the real logo hook, Workspace/Operations/System groups, the four-item mobile bar, an initially closed accessible More sheet, 44px targets, visible focus styles, and reduced-motion handling. Include a 320px long-label fixture.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run tests/dashboard-shell.test.ts`

  Expected: FAIL because the shell does not exist.

- [ ] **Step 3: Implement the shared shell**

  Preserve `.brand-mark`/`.brand-logo` compatibility with `applyBrandLogo`. Use the approved black/slate/gold system and keep the mobile sheet animation at `220ms cubic-bezier(.23,1,.32,1)` with transform origin at the More control edge.

- [ ] **Step 4: Make brand refresh idempotent with the new shell**

  Update `applyBrandRefresh(html)` so it recognizes the integrated 2026 theme and does not inject duplicate search, Inbox, or theme styles.

- [ ] **Step 5: Run shell and brand tests**

  Run: `npm test -- --run tests/dashboard-shell.test.ts tests/brand-refresh.test.ts`

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/dashboard-shell.ts src/brand.ts tests/dashboard-shell.test.ts tests/brand-refresh.test.ts
  git commit -m "Build responsive command center shell"
  ```

### Task 3: Overview and workflow pages

**Files:**
- Create: `src/dashboard-pages.ts`
- Create: `tests/dashboard-pages.test.ts`

**Interfaces:**
- Consumes: `DashboardViewModel`
- Produces: `renderDashboardPage(model: DashboardViewModel): string`

- [ ] **Step 1: Write failing page tests**

  Assert Overview contains only four quick-look metrics, three priority actions, pipeline snapshot, and integration health; Leads contains desktop rows and mobile cards; Pipeline groups real stages; Previews hides unavailable capability controls; Agents/Inbox/Accounting/Legal/Integrations/Settings use truthful copy and permission labels; empty stores render actionable empty states.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run tests/dashboard-pages.test.ts`

  Expected: FAIL because page renderers do not exist.

- [ ] **Step 3: Implement Overview, Leads, Pipeline, and Previews renderers**

  Use semantic headings, native links/buttons, escaped lead content, and no invented activity or metrics.

- [ ] **Step 4: Implement Agents, Inbox, Accounting, Legal, Integrations, and Settings renderers**

  Keep Inbox honest, Books read-only, Legal non-binding, and Settings free of secret values.

- [ ] **Step 5: Run the focused page tests**

  Run: `npm test -- --run tests/dashboard-pages.test.ts`

  Expected: all page tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/dashboard-pages.ts tests/dashboard-pages.test.ts
  git commit -m "Add focused command center pages"
  ```

### Task 4: Lead workspace and guarded actions

**Files:**
- Modify: `src/dashboard-pages.ts`
- Modify: `src/dashboard-model.ts`
- Create: `tests/dashboard-lead-workspace.test.ts`

**Interfaces:**
- Consumes: selected `Lead`, current `actionMarkup`, existing mutation endpoints
- Produces: `renderLeadWorkspace(model: DashboardViewModel): string`

- [ ] **Step 1: Write failing lead-workspace tests**

  Assert business info, recorded audit evidence, score, demo state, outreach draft, activity/stage progress, and notes render from the selected lead; missing ids show a safe not-found state; approve and send are separate; send is disabled without contact email; stage options do not imply invalid direct transitions.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run tests/dashboard-lead-workspace.test.ts`

  Expected: FAIL because the dedicated workspace renderer does not exist.

- [ ] **Step 3: Move the existing lead-detail behavior into the dedicated renderer**

  Preserve `/api/leads/:id/approve`, `/send`, and `/stage` client calls and their current confirmation/error handling.

- [ ] **Step 4: Add capability-gated preview controls**

  Keep the production helper names `generateLead`, `uploadPreview`, and `restoreGeneratedPreview`; render each control only when its capability is true.

- [ ] **Step 5: Run the lead-workspace tests**

  Run: `npm test -- --run tests/dashboard-lead-workspace.test.ts`

  Expected: all workspace and safety assertions pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/dashboard-model.ts src/dashboard-pages.ts tests/dashboard-lead-workspace.test.ts
  git commit -m "Move lead work into dedicated workspace"
  ```

### Task 5: Express routes and dashboard composition

**Files:**
- Replace: `src/dashboard.ts`
- Modify: `src/server.ts`
- Modify: `tests/server-mobile.test.ts`
- Create: `tests/server-pages.test.ts`

**Interfaces:**
- Consumes: `parseDashboardPage`, `buildDashboardViewModel`, `renderDashboardPage`, `renderDashboardShell`
- Produces: `renderDashboard(leads, page?, selectedLeadId?, capabilities?): string`, `createApp(store?: LeadStore): Express`

- [ ] **Step 1: Write failing route/composition tests**

  Start `createApp()` on an ephemeral port and use native `fetch` to assert all approved GET routes return 200 with the correct active page; unknown routes return 404; missing lead ids return a safe workspace state; existing POST endpoints still return their existing guarded errors.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run tests/server-pages.test.ts tests/server-mobile.test.ts`

  Expected: FAIL because `createApp` and page routes do not exist.

- [ ] **Step 3: Compose the new dashboard export**

  Keep the public `renderDashboard` export so existing imports remain valid.

- [ ] **Step 4: Add real Express GET routes**

  Map `/`, `/leads`, `/leads/:id`, `/pipeline`, `/previews`, `/agents`, `/inbox`, `/accounting`, `/legal`, `/integrations`, and `/settings` without changing mutation implementations.

- [ ] **Step 5: Update mobile/reference tests to the approved structure**

  Replace obsolete single-page anchor assertions with real-link, bottom-navigation, More-sheet, mobile-card, and stacked-workspace assertions.

- [ ] **Step 6: Run server and legacy tests**

  Run: `npm test -- --run tests/server-pages.test.ts tests/server-mobile.test.ts tests/brand-refresh.test.ts tests/pipeline.test.ts tests/communications.test.ts`

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add src/dashboard.ts src/server.ts tests/server-mobile.test.ts tests/server-pages.test.ts
  git commit -m "Route command center workflows to dedicated pages"
  ```

### Task 6: Durable decision, verification, and GitHub handoff

**Files:**
- Modify: `company-os/DECISIONS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**
- Consumes: completed multipage implementation and verification results
- Produces: documented navigation architecture and production reconciliation note

- [ ] **Step 1: Document the approved multipage decision**

  Record why Overview is intentionally shallow, why real server routes were chosen, and why mobile uses primary bottom navigation plus a secondary sheet.

- [ ] **Step 2: Document operation and reconciliation**

  Describe the routes and note that production-only Designer/upload commits must be merged without removing `generateLead`, `uploadPreview`, `restoreGeneratedPreview`, or their server handlers.

- [ ] **Step 3: Run the full verification suite**

  Run: `npm run typecheck && npm test && npm run build`

  Expected: all commands exit 0.

- [ ] **Step 4: Run repository and browser checks**

  Run: `git diff --check` and capture desktop plus 390px mobile renders for Overview, Leads, Lead Workspace, Pipeline, Previews, and the open More sheet.

  Expected: no whitespace errors, no console errors, no horizontal overflow at 320px, and all reviewed states match the approved preview.

- [ ] **Step 5: Commit documentation**

  ```bash
  git add company-os/DECISIONS.md docs/ARCHITECTURE.md docs/OPERATIONS.md
  git commit -m "Document multipage command center"
  ```

- [ ] **Step 6: Review the branch before push**

  Inspect `git status --short`, `git diff main...HEAD --check`, `git diff --stat main...HEAD`, and `git log --oneline main..HEAD`.

- [ ] **Step 7: Push the feature branch**

  Run: `git push -u origin feat/multipage-command-center`

  Expected: GitHub accepts the branch. Do not deploy production until the live-only Designer/upload commits have been reconciled and the combined suite passes.

