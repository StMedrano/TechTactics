function list(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  appMode: process.env.APP_MODE || 'demo',
  port: Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000),
  sharedSecret: process.env.AGENTS_SHARED_SECRET || '',
  clientOrigins: list(process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5176'),
  portalApiBaseUrl: String(process.env.PORTAL_API_BASE_URL || '').replace(/\/+$/, ''),
  portalAgentWebhookSecret: process.env.PORTAL_AGENT_WEBHOOK_SECRET || '',
  autorunEnabled: String(process.env.AGENTS_AUTORUN_ENABLED || 'false').toLowerCase() === 'true',
  defaultDryRun: String(process.env.AGENTS_DEFAULT_DRY_RUN || 'false').toLowerCase() === 'true',
  maxTasksPerRun: Number(process.env.AGENTS_MAX_TASKS_PER_RUN || 25),
  business: {
    name: process.env.BUSINESS_NAME || 'TechTactics',
    email: process.env.BUSINESS_EMAIL || 'portal@mytechtactics.com',
    phone: process.env.BUSINESS_PHONE || '225-210-9890',
    serviceArea: process.env.BUSINESS_SERVICE_AREA || 'Baton Rouge and surrounding areas'
  },
  tables: {
    users: process.env.CATALYST_TABLE_USERS || 'Users',
    tickets: process.env.CATALYST_TABLE_TICKETS || 'Tickets',
    services: process.env.CATALYST_TABLE_SERVICES || 'Services',
    invoices: process.env.CATALYST_TABLE_INVOICES || 'Invoices',
    leads: process.env.CATALYST_TABLE_LEADS || 'Leads',
    campaigns: process.env.CATALYST_TABLE_CAMPAIGNS || 'Campaigns',
    campaignAssets: process.env.CATALYST_TABLE_CAMPAIGN_ASSETS || 'Campaign_Assets',
    agentTasks: process.env.CATALYST_TABLE_AGENT_TASKS || 'Agent_Tasks',
    agentActivityLog: process.env.CATALYST_TABLE_AGENT_ACTIVITY_LOG || 'Agent_Activity_Log',
    leadFollowups: process.env.CATALYST_TABLE_LEAD_FOLLOWUPS || 'Lead_Followups',
    reviews: process.env.CATALYST_TABLE_REVIEWS || 'Reviews'
  }
};
