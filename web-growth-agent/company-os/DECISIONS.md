# Decisions

Record important TechTactics Web Growth decisions with the reason they were made.

## 2026-09-25 — Website-first public business

**Decision:** Position TechTactics publicly as a website-building company for the current phase.

**Rationale:** Focus the offer and sales motion while preserving the TechTactics umbrella brand for future MSP/IT, Smart Home, and Business Installation divisions.

**Affected systems:** Public site, packages, lead pipeline, portal labels/workflows, Website Growth Agent.

**Revisit when:** TechTactics intentionally launches another service division.

## 2026-09-25 — Build the AI team with the company

**Decision:** Use an AI-native operating model where workers are present while processes are built instead of trying to onboard agents after the business is mature.

**Rationale:** The supplied Professor Glitch video emphasized that context, rationale, and operating knowledge are easier to preserve when documentation and agent participation happen during the work.

**Affected systems:** Agent instructions, company memory, decision logging, future Founder Inbox, delivery playbooks.

**Revisit when:** A better architecture preserves the same portability, auditability, and company ownership of knowledge.

## 2026-09-25 — Company-owned files are authoritative memory

**Decision:** Durable business rules and lessons belong in repository/database documents owned by TechTactics, not solely in model/session memory.

**Rationale:** Models and sessions can change. The company needs portable, readable, auditable institutional knowledge.

**Affected systems:** `company-os/`, agent runtime context assembly, future client/project documentation.

**Revisit when:** Any replacement still provides explicit company ownership, exportability, version history, and human review.

## 2026-09-25 — First-contact outreach remains human-approved

**Decision:** The Web Growth Agent may prepare first-contact outreach. A person must approve the exact generated version before an explicit Zoho Mail send action can transmit it. No autonomous/bulk first-contact sending is allowed.

**Rationale:** Protect reputation, reduce compliance risk, and keep factual/evidence quality under human control while still allowing the approved workflow to complete inside the tool.

**Affected systems:** Sales agent, lead pipeline, Zoho Mail MCP, communication logging.

**Revisit when:** TechTactics has approved messaging, compliant communication rules, production logging, and a deliberate policy change.

## 2026-09-25 — Zoho communication is capability-scoped

**Decision:** Mail read/search uses read-only Zoho Mail tools; customer send/reply actions receive only the mutation capability needed for the explicit operation. Internal agent email is limited to configured role addresses.

**Rationale:** Connecting a tool must not grant every agent unrestricted mailbox mutation.

**Affected systems:** Zoho Mail MCP, Sales, Manager, Accounting/Tax, Legal, audit logs.

**Revisit when:** A stronger centrally enforced permission broker replaces the current allow-list design.

## 2026-09-25 — Accounting/Tax is read-only by default

**Decision:** The Accounting/Business Tax assistant may analyze Zoho Books using an explicit read-only MCP tool allow-list. It does not autonomously alter books, file returns, make tax elections, or initiate money movement.

**Rationale:** Financial/tax analysis benefits from live records, while irreversible bookkeeping, filing, and payment actions require human and professional review.

**Affected systems:** Zoho Books MCP, Accounting/Tax agent, month-end/tax-prep workflow.

**Revisit when:** Specific write workflows have separate approvals, audit trails, and professional review requirements.

## 2026-09-25 — Legal is support, not autonomous counsel

**Decision:** The Legal assistant may summarize, issue-spot, draft, and prepare attorney briefing material. It may not sign/accept agreements, settle disputes, admit liability, or make binding legal decisions.

**Rationale:** Legal support can reduce administrative workload while material legal judgment and commitments remain with TechTactics and qualified counsel.

**Affected systems:** Legal agent, contract/policy workflows, internal Zoho Mail coordination.

**Revisit when:** Never for unauthorized practice or binding commitments; individual workflow permissions may be expanded only with appropriate counsel and explicit approval.
