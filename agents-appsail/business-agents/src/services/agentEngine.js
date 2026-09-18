import { env } from '../config/env.js';
import { AGENT_CATALOG, SERVICE_CATEGORIES, getAgent } from '../data/agentCatalog.js';
import { createTask, insertRow, logActivity, safeListRows } from './catalystStore.js';
import { scoreLead, upsertLead } from './leadService.js';
import { nowIso, pick, rowId, titleCase, toNumber } from '../utils/records.js';

function task(agentKey, type, summary, details = {}, overrides = {}) {
  return {
    agentKey,
    type,
    summary,
    details,
    priorityLevel: overrides.priorityLevel || 'normal',
    status: overrides.status || 'needs_approval',
    relatedTable: overrides.relatedTable || '',
    relatedRecordId: overrides.relatedRecordId || '',
    approvalRequired: overrides.approvalRequired !== false
  };
}

async function persistTasks(req, tasks, dryRun) {
  const limited = tasks.slice(0, env.maxTasksPerRun);
  if (dryRun) return limited.map((item) => ({ ...item, dryRun: true }));

  const saved = [];
  for (const item of limited) {
    saved.push(await createTask(req, item));
  }
  return saved;
}

function ticketStatus(row) {
  return String(pick(row, 'status') || '').toLowerCase().replace(/[\s-]+/g, '_');
}

function customerName(row) {
  return pick(row, 'customer_name', 'customerName', 'name') || 'Customer';
}

async function runLeadIntake(req, input) {
  if (input?.lead || input?.email || input?.phone || input?.from) {
    const result = await upsertLead(req, input.lead || input);
    const summary = `${result.score.label} lead from ${result.lead.source || 'manual'}: ${result.lead.name || result.lead.email || result.lead.phone}`;
    const tasks = [
      task('lead_intake', 'lead_review', summary, result, {
        priorityLevel: result.score.label === 'Hot' ? 'high' : 'normal',
        relatedTable: env.tables.leads,
        relatedRecordId: rowId(result.saved)
      })
    ];
    return { tasks, metrics: { processedLeads: 1, hotLead: result.score.label === 'Hot' } };
  }

  const { rows, error } = await safeListRows(req, env.tables.leads, { limit: 100 });
  const tasks = rows
    .filter((lead) => ['new', 'open', ''].includes(String(pick(lead, 'status') || '').toLowerCase()))
    .map((lead) => {
      const scored = scoreLead({
        email: pick(lead, 'email'),
        phone: pick(lead, 'phone'),
        address: pick(lead, 'address'),
        serviceInterest: pick(lead, 'service_interest', 'serviceInterest'),
        urgency: pick(lead, 'urgency'),
        notes: pick(lead, 'notes')
      });
      return task(
        'lead_intake',
        'lead_review',
        `${scored.label} lead needs review: ${pick(lead, 'name', 'email', 'phone') || 'Unnamed lead'}`,
        { lead, score: scored },
        { priorityLevel: scored.label === 'Hot' ? 'high' : 'normal', relatedTable: env.tables.leads, relatedRecordId: rowId(lead) }
      );
    });

  return { tasks, metrics: { scannedLeads: rows.length }, warnings: error ? [error] : [] };
}

async function runMarketingContent() {
  const week = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const tasks = SERVICE_CATEGORIES.slice(0, 4).map((category) =>
    task(
      'marketing_content',
      'content_draft',
      `Draft ${category} marketing post for week of ${week}.`,
      {
        channel: 'social/email',
        topic: category,
        draft: `${env.business.name} helps ${env.business.serviceArea} customers with ${category.toLowerCase()}. Highlight one customer problem, one clean solution, and one portal call-to-action.`
      }
    )
  );
  return { tasks, metrics: { drafts: tasks.length } };
}

async function runAdsManager() {
  const tasks = SERVICE_CATEGORIES.slice(0, 5).map((category) =>
    task(
      'ads_manager',
      'ad_campaign_recommendation',
      `Prepare approval packet for ${category} lead campaign.`,
      {
        channel: category.includes('Security') ? 'Google Search + Meta Lead Ads' : 'Google Search',
        targetService: category,
        approvalGate: 'Admin must approve campaign copy, budget, and launch date.',
        suggestedKeywords: [category, `${category} near me`, `${env.business.serviceArea} ${category}`]
      },
      { priorityLevel: category.includes('Security') ? 'high' : 'normal' }
    )
  );
  return { tasks, metrics: { campaignRecommendations: tasks.length } };
}

async function runLeadNurture(req) {
  const { rows, error } = await safeListRows(req, env.tables.leads, { limit: 100 });
  const tasks = rows
    .filter((lead) => {
      const status = String(pick(lead, 'status') || 'new').toLowerCase();
      return !['won', 'converted', 'booked', 'closed'].includes(status);
    })
    .slice(0, 12)
    .map((lead) =>
      task(
        'lead_nurture',
        'followup_queue',
        `Queue follow-up for ${pick(lead, 'name', 'email', 'phone') || 'lead'}.`,
        {
          channel: pick(lead, 'phone') ? 'call_or_sms_after_opt_in' : 'email',
          serviceInterest: pick(lead, 'service_interest', 'serviceInterest'),
          reminder: 'Use approved do-not-reply email/SMS template and verify opt-in before SMS.'
        },
        { relatedTable: env.tables.leads, relatedRecordId: rowId(lead) }
      )
    );
  return { tasks, metrics: { nurtureCandidates: tasks.length }, warnings: error ? [error] : [] };
}

async function runReviewReputation(req) {
  const { rows, error } = await safeListRows(req, env.tables.tickets, { limit: 150 });
  const tasks = rows
    .filter((ticket) => ticketStatus(ticket) === 'completed')
    .slice(0, 12)
    .map((ticket) =>
      task(
        'review_reputation',
        'review_request',
        `Send review request for completed ticket #${rowId(ticket)}.`,
        {
          customer: customerName(ticket),
          service: pick(ticket, 'title', 'service_type', 'category'),
          reminder: 'Admin approval required before sending review request.'
        },
        { relatedTable: env.tables.tickets, relatedRecordId: rowId(ticket) }
      )
    );
  return { tasks, metrics: { completedTickets: tasks.length }, warnings: error ? [error] : [] };
}

async function runCustomerRetention(req) {
  const { rows: services, error } = await safeListRows(req, env.tables.services, { limit: 150 });
  const tasks = services.slice(0, 12).map((service) =>
    task(
      'customer_retention',
      'maintenance_offer',
      `Review maintenance plan opportunity for ${pick(service, 'service_name', 'name', 'category') || 'customer service'}.`,
      {
        service,
        offerType: 'Quarterly system checkup or priority support plan',
        approvalGate: 'Admin approves before customer outreach.'
      },
      { relatedTable: env.tables.services, relatedRecordId: rowId(service) }
    )
  );
  return { tasks, metrics: { retentionCandidates: tasks.length }, warnings: error ? [error] : [] };
}

async function runDispatchOptimizer(req) {
  const { rows, error } = await safeListRows(req, env.tables.tickets, { limit: 150 });
  const statuses = new Set(['approved', 'quote_approved', 'deposit_paid', 'scheduled', 'pending']);
  const tasks = rows
    .filter((ticket) => statuses.has(ticketStatus(ticket)))
    .filter((ticket) => !pick(ticket, 'employee_id', 'employeeId') || !pick(ticket, 'scheduled_date', 'scheduledDate'))
    .slice(0, 12)
    .map((ticket) =>
      task(
        'dispatch_optimizer',
        'schedule_assignment_recommendation',
        `Recommend assignment/schedule for ticket #${rowId(ticket)}.`,
        {
          customer: customerName(ticket),
          service: pick(ticket, 'title', 'service_type', 'category'),
          currentStatus: pick(ticket, 'status'),
          rule: 'Only one install per day. Admin must approve final schedule and assignment.'
        },
        { priorityLevel: 'high', relatedTable: env.tables.tickets, relatedRecordId: rowId(ticket) }
      )
    );
  return { tasks, metrics: { unscheduledApprovedTickets: tasks.length }, warnings: error ? [error] : [] };
}

async function runQuoteInvoiceAssistant(req) {
  const { rows, error } = await safeListRows(req, env.tables.tickets, { limit: 150 });
  const tasks = rows
    .filter((ticket) => ['pending_approval', 'approved', 'completed'].includes(ticketStatus(ticket)))
    .slice(0, 15)
    .map((ticket) => {
      const status = ticketStatus(ticket);
      const type = status === 'completed' ? 'invoice_draft_review' : 'quote_draft_review';
      const amount = toNumber(pick(ticket, 'quote_amount', 'quoteAmount'));
      return task(
        'quote_invoice_assistant',
        type,
        `${status === 'completed' ? 'Review invoice' : 'Prepare quote'} for ticket #${rowId(ticket)}.`,
        {
          customer: customerName(ticket),
          service: pick(ticket, 'title', 'service_type', 'category'),
          quoteAmount: amount,
          suggestion: 'Pull item/labor pricing from Zoho Books before sending.'
        },
        { relatedTable: env.tables.tickets, relatedRecordId: rowId(ticket) }
      );
    });
  return { tasks, metrics: { billingReviewItems: tasks.length }, warnings: error ? [error] : [] };
}

async function runWebsiteConversion() {
  const tasks = SERVICE_CATEGORIES.map((category) =>
    task(
      'website_conversion',
      'landing_page_recommendation',
      `Review landing page CTA for ${category}.`,
      {
        targetService: category,
        recommendedCTA: 'Portal Login / Request Assistance',
        checks: ['mobile CTA visibility', 'service proof', 'quote path clarity', 'phone/email visibility']
      },
      { approvalRequired: false, status: 'open' }
    )
  );
  return { tasks, metrics: { landingPageChecks: tasks.length } };
}

async function runBusinessInsights(req) {
  const [leads, tickets, invoices, tasks] = await Promise.all([
    safeListRows(req, env.tables.leads, { limit: 500 }),
    safeListRows(req, env.tables.tickets, { limit: 500 }),
    safeListRows(req, env.tables.invoices, { limit: 500 }),
    safeListRows(req, env.tables.agentTasks, { limit: 500 })
  ]);
  const metrics = {
    leads: leads.rows.length,
    tickets: tickets.rows.length,
    completedTickets: tickets.rows.filter((ticket) => ticketStatus(ticket) === 'completed').length,
    invoices: invoices.rows.length,
    openAgentTasks: tasks.rows.filter((item) => !['done', 'completed', 'cancelled'].includes(String(pick(item, 'status') || '').toLowerCase())).length
  };
  const summary = `Weekly snapshot: ${metrics.leads} leads, ${metrics.tickets} tickets, ${metrics.completedTickets} completed tickets, ${metrics.invoices} invoices, ${metrics.openAgentTasks} open agent tasks.`;

  return {
    tasks: [
      task(
        'business_insights',
        'weekly_snapshot',
        summary,
        { metrics, generatedAt: nowIso() },
        { approvalRequired: false, status: 'open' }
      )
    ],
    metrics,
    warnings: [leads.error, tickets.error, invoices.error, tasks.error].filter(Boolean)
  };
}

const runners = {
  lead_intake: runLeadIntake,
  marketing_content: runMarketingContent,
  ads_manager: runAdsManager,
  lead_nurture: runLeadNurture,
  review_reputation: runReviewReputation,
  customer_retention: runCustomerRetention,
  dispatch_optimizer: runDispatchOptimizer,
  quote_invoice_assistant: runQuoteInvoiceAssistant,
  website_conversion: runWebsiteConversion,
  business_insights: runBusinessInsights
};

export async function runAgent(req, agentKey, input = {}) {
  const agent = getAgent(agentKey);
  if (!agent || !runners[agentKey]) {
    const error = new Error(`Unknown agent: ${agentKey}`);
    error.status = 404;
    throw error;
  }

  const dryRun = input.dryRun ?? env.defaultDryRun;
  const startedAt = nowIso();
  const result = await runners[agentKey](req, input);
  const persistedTasks = await persistTasks(req, result.tasks || [], dryRun);
  const payload = {
    agent,
    dryRun,
    startedAt,
    completedAt: nowIso(),
    createdTasks: persistedTasks.length,
    taskPreview: dryRun ? persistedTasks : [],
    metrics: result.metrics || {},
    warnings: result.warnings || []
  };

  await logActivity(req, {
    agentKey,
    action: 'run_agent',
    status: 'ok',
    details: payload
  }).catch(() => {});

  return payload;
}

export async function runAgents(req, input = {}) {
  const requested = Array.isArray(input.agents) && input.agents.length
    ? input.agents
    : AGENT_CATALOG.map((agent) => agent.key);

  const results = [];
  for (const agentKey of requested) {
    results.push(await runAgent(req, agentKey, { ...input, dryRun: input.dryRun ?? env.defaultDryRun }));
  }

  return {
    ran: results.length,
    createdTasks: results.reduce((sum, item) => sum + Number(item.createdTasks || 0), 0),
    results
  };
}

export async function intakeLead(req, payload = {}) {
  return runAgent(req, 'lead_intake', payload);
}

export function agentSummary() {
  return AGENT_CATALOG.map((agent) => ({
    ...agent,
    label: titleCase(agent.key)
  }));
}
