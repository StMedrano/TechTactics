# TechTactics AI Company Operating Model

## Purpose

TechTactics should be built with its AI workers present while the company is being designed, sold, delivered, and improved. The goal is not a collection of disconnected chatbots. The goal is a company operating system whose workers have explicit instructions, durable company-owned knowledge, current context, controlled tools, and clear lanes.

This model applies first to **TechTactics Websites** and is designed to extend later to:
- TechTactics Managed IT / MSP
- TechTactics Smart Home
- TechTactics Business Installations

## Core principle: flip the order

Traditional automation is often bolted onto a finished business. That creates a large onboarding problem because the automation did not witness the decisions that shaped the business.

TechTactics should instead:
1. Build the business process.
2. Keep the relevant AI worker present while the process is created.
3. Record decisions and rationale as part of the work.
4. Convert repeated work into reusable skills.
5. Connect approved tools only after the operating rule is clear.
6. Add specialized workers as lanes become large enough to own separately.

The company therefore accumulates usable institutional knowledge from day one.

## The five-part worker contract

Every TechTactics AI worker must define these five parts.

### 1. Skills

Skills are written instructions the worker follows. They are the equivalent of SOPs for a human employee.

A skill should define:
- Goal
- Inputs
- Procedure
- Required evidence
- Output format
- Approval gates
- Failure/exception handling
- What must be documented after completion

Repeated successful work should become a skill instead of living only in chat history.

### 2. Memory

Memory is durable company-owned information, stored outside the model.

Examples:
- Brand rules
- Offers and package definitions
- Sales lessons
- Client/project decisions
- Reusable implementation patterns
- Approved messaging
- Integration conventions
- Known failure modes

Models can change and sessions can end. The company memory must remain readable, editable, portable, and auditable.

### 3. Context

Context is what the worker needs **right now** to complete the current task.

Examples:
- The current prospect and audit evidence
- Current client project
- Latest conversation
- Current package/pricing rules
- Relevant site files
- Current deployment state
- Approval state
- Deadline or next action

Do not load the entire company into every worker. Give each worker the smallest useful current context plus links to durable memory.

### 4. Tools

Tools are what the worker is allowed to touch.

Each tool permission should specify:
- Read vs write access
- Scope
- Approval requirement
- Audit/logging requirement
- Reversibility
- Secret handling rules

High-risk actions remain human-approved.

### 5. More than one

Use specialized workers with clear ownership instead of one agent trying to do everything.

For the website business, the initial lanes are:
- Manager — coordinates the department and escalations.
- Scout — discovers businesses and captures factual public data.
- Auditor — evaluates websites with reproducible evidence.
- Designer — creates private concepts/demos and reusable site patterns.
- Sales — turns approved evidence into personalized outreach/proposal drafts.

Future lanes can include:
- Client Onboarding
- Project Manager
- Content
- Development
- QA/Launch
- Care Plan/Support
- Billing/Finance
- Analytics/Insights

## Documentation is an output of the work

Every meaningful build/change should update the relevant documentation at the same time.

For websites this means the delivery process should leave behind:
- Page/site map
- Reusable components
- Brand/design rules
- Content conventions
- Form and CRM mappings
- Integration notes
- Deployment/domain notes
- Client decisions
- Support/change instructions

The desired state is not "remember to document later." The desired state is "the workflow is incomplete until the documentation is updated."

## Decision records preserve the why

A durable decision entry should include:
- Date
- Decision
- Rationale
- Evidence/constraints
- Affected systems
- Revisit condition

This is especially important for package scope, pricing logic, brand choices, lead qualification rules, automation boundaries, and client-specific exceptions.

## Conversational founder interface

TechTactics should eventually expose a Founder Inbox that accepts text or voice.

The workflow:
1. Capture the raw founder instruction.
2. Extract tasks, facts, decisions, and rationale.
3. Separate temporary context from durable memory.
4. Propose affected systems/files.
5. Request approval where the action is external, destructive, financial, or public.
6. Execute approved changes.
7. Update documentation and decision records.
8. Return an audit summary.

This allows "say what should change" to become a controlled system update without turning every internal change into a ticket.

## Website plus business system

TechTactics should sell outcomes, not only pages. A website can connect to:
- Lead forms
- CRM
- Follow-up
- Booking
- Proposals
- Approvals
- Invoicing/payments
- Support
- Analytics
- Automation

The **Business Platform** package is the natural home for deeper integrations, while reusable capabilities learned there should become skills/templates for future clients.

## Reuse loop

When a useful pattern is discovered:
1. Prove it on a real task.
2. Document the method.
3. Turn it into a skill/template/component.
4. Add tests/checklists where practical.
5. Record tool requirements and permissions.
6. Reuse it on the next relevant client.
7. Feed failures and wins back into the skill.

The company's advantage should compound as its playbooks improve.

## Safety and approval boundaries

Agents may automatically perform low-risk internal analysis and drafting. Human approval is required before actions such as:
- First-contact outreach
- Public publishing
- Ad spend or budget changes
- Price changes
- Customer commitments
- Proposals/invoices/payments
- Production infrastructure changes
- Destructive data operations
- Changes to legal/contractual language

All material actions should be auditable.

## Repository implementation

The current Web Growth Agent implements this model through:
- `web-growth-agent/agents/` — specialized worker instructions
- `web-growth-agent/company-os/SKILLS.md`
- `web-growth-agent/company-os/MEMORY.md`
- `web-growth-agent/company-os/CONTEXT.md`
- `web-growth-agent/company-os/TOOLS.md`
- `web-growth-agent/company-os/TEAM.md`
- `web-growth-agent/company-os/DECISIONS.md`

These files are intentionally plain text/Markdown so the operating knowledge remains owned by TechTactics and usable by different agent runtimes.
