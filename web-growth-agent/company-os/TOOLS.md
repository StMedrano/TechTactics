# Tools

Tools are the systems an agent is explicitly allowed to touch.

## Current Web Growth Agent permissions

Allowed for low-risk internal work:
- Read approved repository/company files.
- Use official business/location APIs configured by the operator.
- Request the prospect website URL supplied by an approved data source.
- Run deterministic website audits.
- Generate internal analysis, drafts, proposals, and private demo assets.
- Write local/approved lead state and audit artifacts.
- Run tests, typecheck, and build checks.

Human approval required before:
- First-contact email/SMS/call.
- Publicly sharing a generated demo.
- Publishing public website/content changes.
- Changing pricing or making customer commitments.
- Sending a proposal or invoice.
- Spending money or changing an ad budget.
- Changing production infrastructure.
- Deleting business/customer records.

## Tool rule

A tool connection does not automatically grant every possible action. Each agent should receive the narrowest access needed for its lane, and material writes should be logged/auditable.
