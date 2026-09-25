# Operations Guide

## Daily workflow

### 1. Scout one market deliberately
```bash
npm run wga -- scout --market "Prairieville, LA" --category plumber --category electrician --max-results 10
```

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
- AI generation runs only for an explicitly selected lead.
- Google Places field masks should be reviewed against current pricing before production.
