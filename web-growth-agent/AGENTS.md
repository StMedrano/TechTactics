# AGENTS.md — Web Growth Agent

This folder is a standalone TechTactics revenue tool.

## Goal
Create qualified local website opportunities without fabricating problems or sending unsolicited outreach automatically.

## Required behavior
1. Keep factual evidence separate from AI interpretation.
2. Do not claim a website defect unless the audit recorded evidence for it.
3. Never send email/SMS/calls from V1. Produce drafts only.
4. Keep generated demo sites private until a person approves sharing.
5. Prefer small, reviewable commits and update GitHub issue checklists.
6. Run tests and typecheck before declaring a milestone complete.
7. Avoid storing secrets in the repository.
8. Use official APIs rather than scraping search-result pages.
9. Keep the lead status machine valid; do not jump to contacted without approval.
10. When the master issue definition of done is satisfied, close all implementation issues and prepare a release PR.

## Agent roles
See `agents/` for Manager, Scout, Auditor, Designer, and Sales operating contracts.

## Company OS contract

Before doing work, treat `company-os/` as the department's company-owned operating memory:

- `SKILLS.md` — reusable written instructions and SOP expectations.
- `MEMORY.md` — durable facts and lessons that should survive sessions/models.
- `CONTEXT.md` — rules for assembling the current-task context.
- `TOOLS.md` — explicit permissions and approval boundaries.
- `TEAM.md` — worker lanes and handoffs.
- `DECISIONS.md` — dated decisions with rationale.

Do not treat chat history or model memory as the authoritative source for business rules. When a task changes a durable business rule, reusable process, permission boundary, or important rationale, update the appropriate company-os file as part of the same work.
