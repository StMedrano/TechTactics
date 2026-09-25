# TechTactics Web Growth Agent

A human-approved local website-sales pipeline for TechTactics.

The application discovers businesses through the Google Places API, records whether a website is present, audits existing websites using deterministic checks, scores opportunities with visible evidence, generates personalized sales assets with OpenAI, builds private static demo pages, and tracks leads through a simple pipeline.

## Safety and operating principle

**No outreach is sent automatically.** The V1 creates drafts and artifacts for human review. It does not bulk email, text, call, or impersonate a human.

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
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician
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

See `.env.example`. Google Places Text Search uses an explicit field mask to control returned data and billing. Website auditing never scrapes Google search-result pages; it only requests the business website URL supplied by the place record.

Google Places data is subject to Google Maps Platform terms, attribution, and storage/caching rules. Review those requirements before production use.

## Packages used by the sales agent

- **Launch**: small brochure site / first website
- **Growth**: stronger local-service site with lead capture
- **Pro**: advanced functionality, integrations, or booking

Pricing is configurable in `src/packages.ts` and should be reviewed by TechTactics before sending any proposal.

## Architecture

- `src/scout.ts` — local business discovery
- `src/audit.ts` — deterministic site inspection
- `src/score.ts` — transparent opportunity scoring
- `src/ai.ts` — OpenAI sales asset generation
- `src/site.ts` — private static demo generator
- `src/store.ts` — JSON persistence
- `src/pipeline.ts` — workflow orchestration
- `src/server.ts` — local dashboard/API
- `src/cli.ts` — operator commands
- `agents/` — operating instructions for specialized agents

## Definition of done

Tracked in the GitHub master issue for Web Growth Agent V1.
