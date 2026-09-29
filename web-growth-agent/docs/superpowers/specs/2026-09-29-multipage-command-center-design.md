# Multipage Web Growth Command Center Design

## Purpose

Replace the single, dense command-center page with a server-rendered multipage interface that makes the home page a quick operational read and moves detailed work into focused pages. The redesign must preserve the current lead pipeline, human approval, Zoho send, private preview, and permission boundaries.

The approved visual direction is the TechTactics dark operations console: pitch black and deep slate surfaces, warm gold as the primary interaction color, green only for healthy/success states, Space Grotesk headings, readable Inter interface copy, restrained motion, and comfortably sized controls.

## Product mode

This is an **Operate** surface. Scanability, task completion, truthful state, and permission clarity take precedence over marketing decoration.

## Information architecture

The application uses real server-rendered URLs:

- `/` — Overview
- `/leads` — searchable/filterable lead list
- `/leads/:id` — focused lead workspace
- `/pipeline` — full pipeline grouped by stage
- `/previews` — generated/uploaded website-preview workspace
- `/agents` — AI team status and responsibilities
- `/inbox` — handoffs, approvals, and blocked work
- `/accounting` — read-only accounting area
- `/legal` — legal support area
- `/integrations` — provider health and permission labels
- `/settings` — non-secret configuration state

The sidebar groups these pages as Workspace, Operations, and System. Every navigation item is a real link and the current page has an explicit active state.

## Overview page

The home page is intentionally small. It answers four questions:

1. What requires owner attention?
2. How many leads are active?
3. What is the projected pipeline value?
4. Are the core services available?

Below those values it shows only:

- the three highest-priority next actions;
- a compact pipeline snapshot;
- core integration health.

Lead tables, full pipeline controls, preview management, agent detail, and system configuration do not appear on Overview.

## Dedicated workflows

### Leads

The Leads page owns search, filters, readable desktop rows, mobile lead cards, and links to `/leads/:id`.

### Lead workspace

The lead workspace keeps business information, audit evidence, opportunity score, demo state, outreach draft, stage progress, notes, and the existing actions together. `Approve Outreach` and `Send Through Zoho` remain separate actions. Invalid stage transitions remain server-controlled.

### Pipeline

The Pipeline page groups leads by their real stage. It does not implement client-only drag-and-drop or bypass `setLeadStage`. Any stage-changing control must continue to call the guarded server route.

### Previews

The Previews page lists real lead demo state. It may expose generation, upload, restore, and preview controls only when the corresponding backend capability exists. It must not render a working-looking control that points to an unavailable route.

The current GitHub `main` branch contains generation data (`salesAssets`, `demoPath`) but is behind the live production checkout for uploaded-preview and Designer-agent support. The UI therefore uses an explicit capability model so the GitHub implementation is safe on its own and can preserve the production-only routes when those commits are reconciled.

### Agents, Inbox, Accounting, Legal, Integrations, Settings

These pages report only current truth. Inbox remains a truthful empty/shell state until persistent messaging exists. Accounting remains read-only. Legal is support, not autonomous counsel. Integrations name permissions such as `Read Only` and `Human Approval Required`. Settings never displays credentials or secret values.

## Mobile navigation

Mobile uses two navigation layers:

- a persistent four-item bottom bar for Home, Leads, Pipeline, and More;
- a bottom sheet opened by More for Previews, Inbox, Agents, Accounting, Legal, Integrations, and Settings.

The sheet uses native buttons and links, 44px or larger targets, `aria-expanded`, Escape-to-close behavior, and an origin-aware 220ms ease-out transition. Reduced-motion mode removes the movement while preserving state feedback. The desktop sidebar is not squeezed into a narrow drawer.

## Rendering architecture

The existing Express application remains dependency-light and server-rendered.

- `dashboard-model.ts` builds the page-independent view model from `Lead[]`.
- `dashboard-pages.ts` renders the individual page bodies.
- `dashboard-shell.ts` renders shared desktop/mobile chrome, navigation, styles, and client helpers.
- `dashboard.ts` selects the page and composes the final document while preserving its public `renderDashboard` export.
- `server.ts` maps real URLs to the page renderer and retains all guarded mutation routes.

No React conversion, client-side router, database change, or new production dependency is required.

## Behavior and safety invariants

- Factual audit evidence stays separate from AI interpretation.
- No customer contact can occur without the existing explicit approval and Zoho send sequence.
- `Approve Outreach` never sends mail.
- `Send Through Zoho` remains guarded and requires an approved, current draft.
- The UI never permits an invalid lead-stage jump.
- Generated demos remain private until approved for sharing.
- Uploaded preview controls appear only when secure upload/restore handlers are available.
- Zoho Books remains read-only.
- Legal workflows do not sign, accept, or make binding decisions.
- Credentials and secret values never appear in rendered HTML.
- Existing API paths and production client helper names are not removed during reconciliation.

## Accessibility and interaction

- Target WCAG 2.2 AA contrast.
- Visible labels and accessible names for controls.
- Logical native tab order and clear focus-visible rings.
- Desktop and mobile text remains at or above the established readable scale.
- Touch targets are at least 44px where space permits.
- Press feedback is immediate and subtle.
- Everyday navigation is not delayed by animation.
- The mobile sheet uses transform/opacity only and respects `prefers-reduced-motion`.
- Empty, unavailable, and permission-limited states explain the next valid action.

## Verification

- Route tests prove every page renders the correct active navigation and content.
- Server tests prove real URLs work and mutation routes retain their existing behavior.
- Responsive tests lock the bottom navigation, More sheet, mobile lead cards, and removal of the desktop sidebar at narrow widths.
- Safety tests prove approval and sending remain distinct, Books remains read-only, secrets are absent, and unavailable preview capabilities do not create dead controls.
- Full typecheck, tests, production build, `git diff --check`, and desktop/mobile browser renders must pass before push.

