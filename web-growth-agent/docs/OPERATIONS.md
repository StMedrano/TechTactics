# Operations Guide

## Daily workflow

### 1. Keep production data clean
If synthetic evaluation records were ever loaded into the same store, remove only those fixtures:

```bash
npm run wga -- purge-fixtures
```

Real OSM/Gemini leads are preserved.

### 2. Scout one market deliberately

```bash
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician --max-results 10 --source auto
```

`auto` resolves the market to coordinates, tries the configured Overpass endpoints in order, and collects OSM results within `WGA_OSM_RADIUS_METERS`. If OSM returns fewer leads than requested, Gemini can supplement the remaining slots. Results are deduplicated before storage.

If the first Overpass server returns a 504 or otherwise fails, the next `WGA_OVERPASS_URLS` endpoint is tried automatically.

### 3. Audit and score

```bash
npm run wga -- audit --all
npm run wga -- qualify --min-score 35
npm run wga -- report
```

Do not lower the qualification threshold simply to create qualified leads. A low score means the current evidence did not show enough website opportunity.

### 4. Select a prospect
Review the Command Center and its evidence. Do not generate demos for every lead automatically.

### 5. Generate a concept

```bash
npm run wga -- generate --lead <id>
```

Inspect:
- `artifacts/<id>/business-summary.txt`
- `artifacts/<id>/outreach-draft.txt`
- `artifacts/<id>/proposal.md`
- `artifacts/<id>/demo/index.html`

### 6. Approve, then contact
Only after checking factual claims:

```bash
npm run wga -- approve --lead <id>
npm run wga -- send --lead <id>
```

For contact made outside the application:

```bash
npm run wga -- stage --lead <id> --to contacted
```

## Scout behavior

- `--source auto`: resilient OSM first; Gemini supplements a sparse result set when available.
- `--source osm`: OSM only. If every configured endpoint fails, the command fails and does not silently invoke Gemini.
- `--source gemini`: Gemini first; a Gemini quota condition may fall back to OSM.
- OSM records with explicit `brand`/`network` metadata are excluded from local-independent prospecting.
- Gemini is instructed to exclude chains, franchises, distributors, big-box retailers, and companies that do not actually perform the requested service.
- Gemini `429 RESOURCE_EXHAUSTED` during supplementation preserves OSM leads already discovered.

## Sparse-market troubleshooting

1. Keep `--source auto` for normal operation so a sparse OSM result can be supplemented.
2. If the territory is legitimately wider, increase `WGA_OSM_RADIUS_METERS`, for example from 25000 to 40000.
3. Search several service categories rather than repeatedly querying only one category.
4. A zero-result or one-result OSM search means OSM coverage is sparse; it is not proof that the local market has no businesses.

## Cost controls

- Scouting requires an explicit market and category.
- Live search is capped by `--max-results` (10 by default).
- OSM is attempted before Gemini in auto mode.
- Gemini is used only for the missing portion of a sparse OSM result set.
- AI demo/proposal generation runs only for an explicitly selected lead.

## Ambiguous Zoho send recovery
The application writes a durable send reservation before calling Zoho. If a timeout, process interruption, or storage issue leaves an attempt ambiguous, do not retry automatically.

1. Check the Zoho Sent folder for the exact recipient/subject.
2. If present:
   ```bash
   npm run wga -- reconcile-send --lead <id> --result sent
   ```
3. If definitely absent:
   ```bash
   npm run wga -- reconcile-send --lead <id> --result not-sent
   ```
4. Only after `not-sent` reconciliation may a new initial send be attempted.
