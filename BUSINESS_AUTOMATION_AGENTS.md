# TechTactics Business Automation Agents

This blueprint defines AI/automation agents that can help run TechTactics marketing, lead intake, follow-up, ads, customer retention, and operations. Each agent should work from approved brand rules, service catalog data, portal tickets, Zoho CRM/Books data, and clear human approval gates.

## Safety Rules For All Agents

- Never spend ad budget without admin approval.
- Never send bulk email/SMS campaigns without admin approval and a compliant opt-in list.
- Never promise pricing, dates, warranties, or availability unless those values come from approved app data.
- Never delete customers, leads, invoices, quotes, tickets, or campaign records automatically.
- Log every action to an `Agent_Activity_Log` table so admins can audit what happened.
- Use `portal@mytechtactics.com` for notification-style emails and keep the do-not-reply language already requested.

## Recommended Agent Team

### 1. Lead Intake Agent

Purpose: Capture, qualify, and route new leads from the website, phone/Twilio, Google lead forms, Facebook lead ads, and manual admin entry.

Automatic actions:

- Create or update a lead/customer profile with name, phone, email, service address, desired service, urgency, and source.
- Detect duplicate leads by email, phone, or address.
- Score the lead as `Hot`, `Warm`, or `Cold`.
- Create a portal ticket in `Pending Approval` when the lead requests service.
- Notify admins when a high-intent lead comes in.

Approval required:

- Creating quotes.
- Booking install dates.
- Sending promotional offers.

Useful tools/data:

- Zoho CRM leads or Catalyst `Users`/`Tickets` tables.
- Twilio call/SMS transcript.
- Website contact forms.
- Google Ads lead form webhook.
- Meta lead ad webhook.

### 2. Marketing Content Agent

Purpose: Create service-area marketing content for smart home, security, Wi-Fi, audio/video, repairs, and maintenance plans.

Automatic actions:

- Draft weekly social posts.
- Draft website/blog content.
- Draft email newsletters.
- Generate short before/after project captions.
- Create seasonal campaign ideas, such as summer outdoor audio, storm-season camera checks, or holiday smart lighting.

Approval required:

- Publishing content.
- Sending emails.
- Using customer photos, names, reviews, addresses, or job details.

Useful tools/data:

- Service catalog.
- Completed job notes.
- Approved reviews.
- Brand voice rules.
- Local service areas.

### 3. Ads Manager Agent

Purpose: Prepare and monitor paid ad campaigns for lead generation.

Automatic actions:

- Draft Google Ads campaign structures for Search, Local, and Performance Max.
- Draft Meta lead ad copy and creative briefs.
- Recommend keywords, negative keywords, audience segments, and landing pages.
- Monitor campaign performance and flag waste, low-quality leads, or high cost per lead.
- Produce weekly ad performance summaries.

Approval required:

- Launching campaigns.
- Changing budgets.
- Pausing campaigns.
- Updating live ad copy.

Useful tools/data:

- Google Ads lead forms.
- Google Business Profile/local assets.
- Meta lead ads.
- Portal lead outcomes, quote approvals, and completed jobs.

### 4. Lead Nurture Agent

Purpose: Follow up with leads that have not booked yet.

Automatic actions:

- Send approved reminder sequences when leads go cold.
- Segment leads by service type, urgency, source, and last contact date.
- Recommend next best action, such as call, SMS, email, or quote follow-up.
- Move qualified leads to admin review.

Approval required:

- First launch of each nurture sequence.
- Any discount offer.
- Any SMS workflow unless opt-in is confirmed.

Useful tools/data:

- Zoho Marketing Automation journeys.
- Zoho CRM lead scoring/Zia scores.
- Portal ticket status.
- Email engagement.

### 5. Review & Reputation Agent

Purpose: Build trusted local reputation after completed work.

Automatic actions:

- Detect completed jobs.
- Queue a review request email/SMS for the customer.
- Capture approved testimonials for the website reviews section.
- Alert admins about negative feedback before publishing anything.

Approval required:

- Publishing reviews to the website.
- Replying publicly to reviews.

Useful tools/data:

- Completed tickets.
- Customer contact preferences.
- Review request templates.
- Website reviews section.

### 6. Customer Retention Agent

Purpose: Keep customers returning for maintenance, upgrades, and recurring support.

Automatic actions:

- Identify customers who may need quarterly camera/Wi-Fi checks.
- Suggest maintenance plan offers.
- Remind customers about device updates, warranty checks, and seasonal tune-ups.
- Recommend upsells based on prior work, such as adding cameras after Wi-Fi upgrades.

Approval required:

- Sending offers.
- Creating recurring invoices/subscriptions.

Useful tools/data:

- Zoho Books invoices.
- Completed service history.
- Maintenance plan enrollment.
- Portal service list.

### 7. Dispatch Optimization Agent

Purpose: Help admins schedule and assign work more efficiently.

Automatic actions:

- Detect open approved jobs that need scheduling.
- Recommend install dates while enforcing one install per day.
- Recommend employee assignment based on clock status, workload, service type, and location.
- Alert admins when a job is stuck in `Pending`, `Awaiting Equipment`, or `Quoted`.

Approval required:

- Final employee assignment.
- Final schedule confirmation.
- Customer-facing schedule messages.

Useful tools/data:

- Service tickets.
- Employee roles and max jobs.
- Time clock and GPS/mileage status.
- Quote approval/deposit status.

### 8. Quote & Invoice Assistant Agent

Purpose: Help admins and employees build quotes and invoices faster.

Automatic actions:

- Suggest line items from Zoho Books based on requested service.
- Pull equipment/labor cost from Zoho Books.
- Compare quote amount vs invoice draft and flag missing items.
- Draft invoice notes from dispatch notes and approved quote details.

Approval required:

- Sending quotes.
- Creating invoices.
- Applying discounts.
- Recording payments.

Useful tools/data:

- Zoho Books items, quotes, invoices, and contacts.
- Portal ticket data.
- Dispatch notes.

### 9. Website Conversion Agent

Purpose: Improve the public website and portal conversion flow.

Automatic actions:

- Track which service pages or calls-to-action lead to requests.
- Recommend homepage copy changes.
- Suggest landing pages for each service category.
- Identify broken buttons, confusing paths, or form drop-offs.

Approval required:

- Publishing website changes.
- Creating new landing pages.

Useful tools/data:

- Website analytics.
- Portal request outcomes.
- Lead source data.

### 10. Business Insights Agent

Purpose: Give the owner a weekly operating snapshot.

Automatic actions:

- Summarize new leads, quote approvals, revenue, open tickets, completed jobs, ad performance, review requests, and employee dispatches.
- Highlight bottlenecks and missed follow-ups.
- Recommend the top three actions for the week.

Approval required:

- None for internal reports.

Useful tools/data:

- Zoho Books.
- Catalyst tickets/users/time clock.
- Campaign metrics.
- Review status.

## Suggested Catalyst Tables

If these agents are built into the portal, add or confirm these tables:

- `Leads`: name, email, phone, address, source, service_interest, status, score, assigned_to, last_contacted_at.
- `Campaigns`: name, channel, status, budget, start_date, end_date, goal, target_service, notes.
- `Campaign_Assets`: campaign_id, asset_type, headline, body, image_url, approval_status.
- `Agent_Tasks`: agent_key, task_type, status, priority, assigned_to, related_record_id, due_at, summary.
- `Agent_Activity_Log`: agent_key, action, status, related_table, related_record_id, details, created_at.
- `Lead_Followups`: lead_id, channel, scheduled_at, sent_at, status, template_key.
- `Reviews`: ticket_id, customer_id, rating, review_text, approval_status, published_at.

## Build Order

1. Start with the Lead Intake Agent and Business Insights Agent because they create immediate visibility.
2. Add the Review & Reputation Agent after ticket completion workflow is stable.
3. Add the Lead Nurture Agent after email opt-in and Zoho Mail/Marketing Automation are configured.
4. Add the Ads Manager Agent as an approval-based assistant first, then connect live campaign APIs later.
5. Add Dispatch Optimization and Quote/Invoice Assistant once the ticket workflow is fully reliable.

## First Automations To Implement

- New lead from website or Twilio creates a lead record and admin notification.
- Completed ticket queues a review request for admin approval.
- Quote approved and deposit paid notifies admin/employee and triggers scheduling.
- Weekly Monday morning business report summarizes leads, jobs, invoices, and follow-ups.
- Dormant lead follow-up queue flags leads with no contact in 48 hours.
