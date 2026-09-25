# TechTactics Website-Building Pivot

## Purpose

For the current phase, TechTactics is a website-building company first. The public experience should make it easy for a local business owner to understand the offer, request a website review, choose a starting package, and become a client.

This is a business-focus change, not a permanent narrowing of the TechTactics brand. The platform should remain ready for future MSP/IT, smart-home, and commercial technology installation divisions.

## Current public offer

### 1. Website Opportunity Review
Use as the primary low-friction call to action for outbound prospects and organic visitors.

Review areas:
- Does the business have a website?
- Is it mobile-friendly?
- Is the value proposition obvious?
- Are services and service areas easy to understand?
- Are phone, quote, booking, and contact actions obvious?
- Does the site look current and trustworthy?
- Are basic local SEO signals present?
- Are there obvious performance or conversion problems?

The review should feed a recommendation rather than a generic design pitch.

### 2. Launch package
Best starting point for a business with no website or a very small existing site.

Typical scope:
- Up to five core pages
- Responsive/mobile-first design
- Contact or quote-request flow
- Basic SEO structure
- Analytics/conversion tracking setup

### 3. Growth package
For businesses with multiple services, locations, campaigns, or stronger lead-generation needs.

Typical scope:
- Expanded service and landing pages
- Conversion-focused calls to action
- Booking/forms/CRM connection
- Local SEO content structure
- Performance and analytics review

### 4. Business Platform package
For businesses that need software or automation in addition to a marketing website.

Typical scope:
- Custom workflows
- Customer/staff portal features
- API integrations
- CRM/invoicing/communications integrations
- Automation
- Ongoing support

Pricing should be configurable instead of hard-coded until TechTactics finalizes its standard pricing and margins.

## Website scouting and sales agent

The Website Growth Agent should operate as a closed feedback loop:

1. Discover nearby businesses.
2. Identify businesses with no website, a weak website, or a clear upgrade opportunity.
3. Capture evidence and business/contact information.
4. Score the opportunity using factual website/business signals.
5. Generate a concise website review.
6. Recommend the most relevant TechTactics package.
7. Create personalized outreach.
8. Send or queue outreach through approved business email tools.
9. Track replies, objections, follow-ups, meetings, proposals, wins, and losses.
10. Feed outcomes back into targeting and messaging so future outreach improves.

The agent should never invent website problems, contact details, testimonials, traffic numbers, or ROI claims.

## CRM / lead stages

Suggested lead pipeline:

- Discovered
- Researched
- Qualified
- Audit Ready
- Outreach Ready
- Contacted
- Replied
- Meeting Scheduled
- Proposal Sent
- Won
- Lost
- Nurture

Each lead should retain:
- Business name
- Category
- Location/service area
- Website URL or no-website status
- Contact channels
- Observed website issues
- Audit summary
- Recommended package
- Outreach history
- Next action
- Owner/agent
- Source
- Status timestamps

## Portal reconfiguration

Do not delete the existing authentication, admin, customer, employee, Zoho, invoice, and automation foundations simply because the public smart-home offering is paused.

Reconfigure them in phases.

### Customer area -> Website Client Portal
Future client-facing functions:
- Project status
- Proposal/quote review
- Invoice/payment links
- Content-request checklist
- File/logo/content uploads
- Revision requests
- Approval milestones
- Domain/hosting information
- Launch checklist
- Maintenance/support requests
- Analytics summary

### Employee area -> Production Workspace
Future staff/contractor functions:
- Assigned website projects
- Tasks and deadlines
- Content/design/development status
- Client blockers
- QA checklist
- Time tracking when useful
- Notes and handoff information

### Admin area -> Website Agency Operations
Future admin functions:
- Leads and pipeline
- Website audits
- Outreach queue
- Packages and pricing
- Proposals
- Projects
- Clients
- Invoices
- Reviews/case studies
- Integrations
- Sales-agent activity
- Metrics

## Public website information architecture

Current public navigation:
- Services
- Packages
- Process
- Work / case studies
- Contact
- Terms

Do not advertise smart-home, MSP, or installation services on the current public website until those divisions are intentionally relaunched.

## Future TechTactics architecture

Keep TechTactics as the umbrella brand.

Suggested eventual service divisions:
- TechTactics Websites
- TechTactics Managed IT / MSP
- TechTactics Smart Home
- TechTactics Business Installations

Shared platform services can include:
- Identity
- CRM/customer records
- Billing
- Zoho integrations
- Communications
- Scheduling
- Support/tickets
- Automation/agents
- Analytics

Each division should have its own:
- Public landing experience
- Service catalog
- Packages
- lead qualification rules
- fulfillment workflow
- terms
- reporting

## AI-native company operating model

The supplied Professor Glitch video was uploaded directly and reviewed on September 25, 2026. Its useful framework is now part of the TechTactics operating model.

### Flip the order

Do not build the company first and try to onboard the AI team later. Bring the agents into the business while the business is being built so they accumulate the operating knowledge, decisions, and rationale as the work happens. This reduces future handoff and makes "day one" of the AI team the same as day one of the company process.

### Five parts of every AI worker

Every agent should have five explicit components:

1. **Skills** — written instructions and SOPs the agent follows.
2. **Memory** — durable, user-owned files the agent writes to and reads back. Do not rely on model memory as the source of truth.
3. **Context** — the current lead, client, project, business state, and relevant recent information in front of the agent for this run.
4. **Tools** — the systems and actions the agent is explicitly allowed to touch.
5. **More than one** — multiple specialized workers assembled into a company, with each worker owning a clear lane.

For the Website Growth Agent, these ideas are represented in `web-growth-agent/company-os/`.

### Preserve the why, not only the what

Company knowledge should capture decisions, rationale, constraints, and rejected alternatives. The goal is to prevent future agents from guessing why TechTactics works a certain way.

A decision record should answer:
- What changed?
- Why did it change?
- What evidence or constraint drove the decision?
- Which systems or workflows are affected?
- What would cause us to revisit it?

### Documentation is part of doing the work

Do not wait until the end of a project to document it. When an agent builds or changes something, the same workflow should update the durable documentation.

For a client website this can include:
- Site structure and page map
- How to add a page
- How to replace images/content
- Brand colors, typography, and reusable components
- Lead/booking flow
- CRM and form mappings
- Domain/hosting/deployment details
- Important client decisions and their rationale

This turns every completed project into reusable operating knowledge.

### Rich founder input

Typed prompts encourage short instructions. Voice or conversational input can capture more context, especially the reason behind decisions. A future TechTactics Founder Inbox should accept voice/text notes, extract decisions and tasks, and route durable facts into the correct company memory or decision file with review before sensitive changes.

### Build the "boring half" that makes the website valuable

A website is the first component, not the whole system. TechTactics should connect the client-facing site to the business systems that make the site useful:

- Lead capture
- CRM/customer records
- Follow-up
- Scheduling/booking
- Proposals and approvals
- Invoicing/payments
- Support/change requests
- Analytics
- Automation

The Website Growth Agent should therefore qualify opportunities not only for design work, but for business-process improvements that fit the Launch, Growth, or Business Platform package.

### Natural-language operations with approval gates

Routine internal changes should be conversational: the owner states the desired outcome and the appropriate agent updates the site, workflow, integration, and documentation together.

Human approval remains required for risky or external actions such as:
- Sending first-contact outreach
- Publishing public content
- Changing pricing
- Spending money
- Sending invoices or proposals
- Changing production infrastructure
- Deleting business/customer data

### Reuse what the company learns

Once TechTactics learns how to solve a recurring problem, convert it into a reusable skill, template, integration, checklist, or playbook. Future client projects should reuse those assets instead of rebuilding the same capability from scratch.

### Source

Professor Glitch video supplied by the owner in the project conversation, originally referenced by:
https://www.tiktok.com/t/ZP8TbeHjk/
