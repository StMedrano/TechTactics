# TechTactics Web Growth Agent

A human-approved local website-sales pipeline for TechTactics.

The application discovers businesses through the Google Places API, records whether a website is present, audits existing websites using deterministic checks, scores opportunities with visible evidence, generates personalized sales assets with Gemini, builds private static demo pages, and tracks leads through a simple pipeline.

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


## Zoho Mail MCP

The agent can use Zoho Mail through Zoho's MCP server while keeping outbound customer email behind the existing human approval gate.

1. In Zoho MCP, create a server that includes Zoho Mail.
2. Enable only the mail tools this project uses: getMailAccounts, getAccountDetails, listEmails, SearchEmails, getMessageContent, getMessageAttachmentInfo, sendEmail, and sendReplyMail.
3. For a server/headless deployment, use Zoho's shared connection authorization mode so the runtime does not need an interactive login on every call.
4. Store the generated server URL in ZOHO_MCP_URL. Treat this URL like a password and never commit it.
5. Configure any internal role addresses with WGA_MANAGER_EMAIL, WGA_SCOUT_EMAIL, WGA_AUDITOR_EMAIL, WGA_DESIGNER_EMAIL, WGA_SALES_EMAIL, WGA_ACCOUNTING_EMAIL, and WGA_LEGAL_EMAIL.

Connection test:

    npm run wga -- zoho-status

Read/search mail without mutation:

    npm run wga -- mail-read --task "Find unread replies from website prospects and summarize the requests."

Set a lead email when one was not discovered from a mailto link:

    npm run wga -- contact-email --lead <lead-id> --email owner@example.com

Customer outreach remains two-step. First approve the demo-ready lead, then explicitly send:

    npm run wga -- approve --lead <lead-id>
    npm run wga -- send --lead <lead-id>

For a reviewed reply to an existing Zoho message:

    npm run wga -- mail-reply --message-id <zoho-message-id> --body "Thanks for getting back to us..."

Internal role-to-role email is also explicit and restricted to configured role addresses:

    npm run wga -- agent-mail --from sales --to manager --subject "Prospect replied" --body "Please review the latest response."

Read-only mail access never receives a send/reply tool. The customer send path requires the lead to be approved, have a reviewed outreach draft, and have a valid contact email. Initial customer sends are reserved durably before Zoho is called and duplicate initial sends are blocked. If a process/provider failure leaves a send ambiguous, check the Zoho Sent folder and run `reconcile-send --lead <id> --result sent|not-sent` before any retry.

## Accounting / Tax and Legal assistants

The internal role network also includes `accounting` and `legal`.

Accounting/Tax uses a separate Zoho Books MCP server configured with `ZOHO_BOOKS_MCP_URL`. The application requires an explicit comma-separated allow-list of **read-only** tool names in `WGA_ZOHO_BOOKS_READ_TOOLS`; it intentionally does not guess tool names or expose the whole Books server.

    npm run wga -- books-status
    npm run wga -- books-read --task "Summarize this month's revenue, major expense categories, and unpaid invoices."

The Accounting/Tax assistant can prepare bookkeeping reviews, close checklists, and tax-prep packets, but does not file returns, make tax elections, initiate payments/transfers, or change the books automatically.

The Legal assistant is an internal drafting/review/issue-spotting role. It can summarize contracts, surface obligations/deadlines, prepare first drafts and attorney briefing questions, and coordinate through internal Zoho Mail. It cannot sign, accept terms, settle disputes, or make binding legal decisions.

Examples:

    npm run wga -- agent-mail --from accounting --to manager --subject "Month-end review" --body "Three items need owner review."
    npm run wga -- agent-mail --from legal --to manager --subject "Contract review" --body "Please review the renewal and indemnity issues."

## Packages used by the sales agent

- **Launch**: small brochure site / first website
- **Growth**: stronger local-service site with lead capture
- **Pro**: advanced functionality, integrations, or booking

Pricing is configurable in `src/packages.ts` and should be reviewed by TechTactics before sending any proposal.

## Architecture

- `src/scout.ts` — local business discovery
- `src/audit.ts` — deterministic site inspection
- `src/score.ts` — transparent opportunity scoring
- `src/ai.ts` — Gemini sales asset generation
- `src/site.ts` — private static demo generator
- `src/store.ts` — JSON persistence
- `src/pipeline.ts` — workflow orchestration
- `src/server.ts` — local dashboard/API
- `src/cli.ts` — operator commands
- `agents/` — operating instructions for specialized agents

## Definition of done

Tracked in the GitHub master issue for Web Growth Agent V1.
