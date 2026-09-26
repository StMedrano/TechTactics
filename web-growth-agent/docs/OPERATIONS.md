# Operations Guide

## Daily workflow

### 1. Scout one market deliberately
```bash
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician --max-results 10 --source auto
```

`auto` uses OpenStreetMap first. The market is resolved to coordinates once per process and Overpass searches within `WGA_OSM_RADIUS_METERS` (25 km by default). Gemini web search is attempted only when OSM returns no leads.

### 2. Audit and score
```bash
npm run wga -- audit --all
npm run wga -- qualify --min-score 35
npm run wga -- report
```

### 3. Select a prospect
Review the dashboard and evidence. Do not generate demos for every lead automatically.

### 4. Generate a concept
```bash
npm run wga -- generate --lead <id>
```

Inspect:
- `artifacts/<id>/business-summary.txt`
- `artifacts/<id>/outreach-draft.txt`
- `artifacts/<id>/proposal.md`
- `artifacts/<id>/demo/index.html`

### 5. Approve
Only after checking every factual claim:
```bash
npm run wga -- approve --lead <id>
```

### 6. Contact after approval
For Zoho Mail, explicitly send the reviewed draft:
```bash
npm run wga -- send --lead <id>
```

For contact made outside the application, mark it manually:
```bash
npm run wga -- stage --lead <id> --to contacted
```

Use `mail-read` to review incoming prospect mail and `mail-reply` only after the reply text has been reviewed. Continue with `responded`, `proposal`, then `won` or `lost`.

## Cost controls
- Scouting requires an explicit market and category.
- Default live search is capped at 10 results per category from the CLI.
- `WGA_SCOUT_SOURCE=auto` is OSM-first, reducing Gemini search usage.
- `WGA_SCOUT_MODEL` defaults to `gemini-3.5-flash-lite` only for the optional Gemini search attempt.
- `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` for routine AI tasks.
- Gemini `429 RESOURCE_EXHAUSTED` errors fall back to OSM rather than crashing the scout.
- `WGA_OSM_RADIUS_METERS` controls the local search radius; increase it cautiously if a sparse market returns no OSM businesses.
- OpenStreetMap is a best-effort discovery source and should not be treated as a complete business directory.
- AI generation runs only for an explicitly selected lead.

## Sparse-market troubleshooting
If a search returns zero leads:
1. Retry with a broader radius, for example `WGA_OSM_RADIUS_METERS=40000`.
2. Try a nearby larger market while keeping the same category.
3. Use `--source gemini` only when Gemini Search quota is available.
4. Treat a zero-result OSM query as incomplete coverage, not proof that there are no businesses.

## Ambiguous Zoho send recovery
The application writes a durable send reservation before calling Zoho. If a timeout, process interruption, or storage issue leaves the attempt in `pending` or `needs_review`, do **not** retry automatically.

1. Check the Zoho Sent folder for the exact recipient/subject.
2. If the message is present:
   ```bash
   npm run wga -- reconcile-send --lead <id> --result sent
   ```
3. If the message is definitely absent:
   ```bash
   npm run wga -- reconcile-send --lead <id> --result not-sent
   ```
4. Only after `not-sent` reconciliation may a new initial send be attempted.
