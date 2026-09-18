# TechTactics Business Agents AppSail

This AppSail hosts the automated business agents for TechTactics. It is designed to run as one Catalyst AppSail named `business-agents`, with individual agents exposed through API endpoints.

## Included Agents

- Lead Intake Agent
- Marketing Content Agent
- Ads Manager Agent
- Lead Nurture Agent
- Review & Reputation Agent
- Customer Retention Agent
- Dispatch Optimization Agent
- Quote & Invoice Assistant Agent
- Website Conversion Agent
- Business Insights Agent

## Local Run

```powershell
cd agents-appsail/business-agents
npm install
npm start
```

Health check:

```powershell
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
```

## Catalyst Deployment

From the workspace root:

```powershell
catalyst deploy appsail --name business-agents --build-path agents-appsail/business-agents --stack node18 --command "npm start"
```

If you deploy by ZIP upload, use:

```text
agents-appsail/business-agents/business-agents-appsail-upload.zip
```

## Required Environment Variables

Set these in Catalyst AppSail environment variables:

```text
APP_MODE=catalyst
AGENTS_SHARED_SECRET=<long random secret>
CLIENT_ORIGINS=https://portal.mytechtactics.com,https://www.mytechtactics.com
PORTAL_API_BASE_URL=https://portalappsail-10124080596.development.catalystappsail.com/api
```

Set the table names if your Catalyst tables use different names:

```text
CATALYST_TABLE_LEADS=Leads
CATALYST_TABLE_CAMPAIGNS=Campaigns
CATALYST_TABLE_CAMPAIGN_ASSETS=Campaign_Assets
CATALYST_TABLE_AGENT_TASKS=Agent_Tasks
CATALYST_TABLE_AGENT_ACTIVITY_LOG=Agent_Activity_Log
CATALYST_TABLE_LEAD_FOLLOWUPS=Lead_Followups
CATALYST_TABLE_REVIEWS=Reviews
```

## API Examples

List agents:

```powershell
Invoke-WebRequest http://localhost:3000/api/agents -UseBasicParsing
```

Run all agents as a dry run:

```powershell
Invoke-WebRequest http://localhost:3000/api/agents/run `
  -Method POST `
  -Headers @{ Authorization = "Bearer <AGENTS_SHARED_SECRET>" } `
  -ContentType "application/json" `
  -Body '{"dryRun":true}'
```

Intake a lead:

```powershell
Invoke-WebRequest http://localhost:3000/api/leads/intake `
  -Method POST `
  -Headers @{ Authorization = "Bearer <AGENTS_SHARED_SECRET>" } `
  -ContentType "application/json" `
  -Body '{"name":"New Customer","phone":"2255550100","serviceInterest":"Security cameras","source":"website","notes":"Needs camera install this week"}'
```

## Approval Model

The agents create `Agent_Tasks` records by default. Risky actions stay approval-gated:

- Ad launch or budget change.
- Bulk email/SMS.
- Quote send.
- Invoice create.
- Schedule confirmation.
- Customer-facing offer.
- Public review reply or publishing.

This lets the agents work automatically while keeping business-critical decisions under admin control.
