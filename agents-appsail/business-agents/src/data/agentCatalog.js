export const SERVICE_CATEGORIES = [
  'Smart Home Installations',
  'Security & Camera Systems',
  'Wi-Fi & Networking',
  'Smart Audio & Entertainment',
  'Repairs & Troubleshooting',
  'Maintenance Plans'
];

export const AGENT_CATALOG = [
  {
    key: 'lead_intake',
    name: 'Lead Intake Agent',
    cadence: 'webhook + every 15 minutes',
    risk: 'low',
    approvalRequiredFor: ['quotes', 'booking install dates', 'promotional offers'],
    purpose: 'Capture, qualify, deduplicate, score, and route new leads.'
  },
  {
    key: 'marketing_content',
    name: 'Marketing Content Agent',
    cadence: 'weekly',
    risk: 'medium',
    approvalRequiredFor: ['publishing content', 'using customer photos or names', 'sending campaigns'],
    purpose: 'Draft service-area content for website, email, and social posts.'
  },
  {
    key: 'ads_manager',
    name: 'Ads Manager Agent',
    cadence: 'weekly + campaign event',
    risk: 'high',
    approvalRequiredFor: ['launching ads', 'changing budgets', 'pausing campaigns'],
    purpose: 'Prepare ad campaigns, watch lead quality, and recommend budget actions.'
  },
  {
    key: 'lead_nurture',
    name: 'Lead Nurture Agent',
    cadence: 'daily',
    risk: 'medium',
    approvalRequiredFor: ['bulk email', 'SMS', 'discounts'],
    purpose: 'Queue compliant follow-ups for leads that have not booked.'
  },
  {
    key: 'review_reputation',
    name: 'Review & Reputation Agent',
    cadence: 'daily',
    risk: 'medium',
    approvalRequiredFor: ['publishing reviews', 'public replies'],
    purpose: 'Request reviews after completed jobs and surface approved testimonials.'
  },
  {
    key: 'customer_retention',
    name: 'Customer Retention Agent',
    cadence: 'weekly',
    risk: 'medium',
    approvalRequiredFor: ['offers', 'recurring invoices', 'maintenance enrollment'],
    purpose: 'Recommend maintenance plan and upgrade opportunities.'
  },
  {
    key: 'dispatch_optimizer',
    name: 'Dispatch Optimization Agent',
    cadence: 'hourly',
    risk: 'medium',
    approvalRequiredFor: ['final employee assignment', 'schedule confirmation', 'customer messages'],
    purpose: 'Recommend schedule and assignment actions while protecting one-install-per-day.'
  },
  {
    key: 'quote_invoice_assistant',
    name: 'Quote & Invoice Assistant Agent',
    cadence: 'ticket event + daily',
    risk: 'medium',
    approvalRequiredFor: ['sending quotes', 'creating invoices', 'discounts', 'payments'],
    purpose: 'Suggest quote/invoice line items and flag missing billing details.'
  },
  {
    key: 'website_conversion',
    name: 'Website Conversion Agent',
    cadence: 'weekly',
    risk: 'low',
    approvalRequiredFor: ['publishing website changes', 'new landing pages'],
    purpose: 'Recommend landing page and CTA improvements.'
  },
  {
    key: 'business_insights',
    name: 'Business Insights Agent',
    cadence: 'weekly',
    risk: 'low',
    approvalRequiredFor: [],
    purpose: 'Summarize leads, jobs, quotes, invoices, follow-ups, and bottlenecks.'
  }
];

export function getAgent(agentKey) {
  return AGENT_CATALOG.find((agent) => agent.key === agentKey);
}
