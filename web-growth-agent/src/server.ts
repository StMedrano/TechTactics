import express from "express";
import { config } from "./config.js";
import { approveLead, setLeadStage } from "./pipeline.js";
import { sendApprovedOutreach } from "./communications.js";
import { buildReport } from "./report.js";
import { LeadStore } from "./store.js";
import type { Lead, LeadStage } from "./types.js";
import { escapeHtml } from "./utils.js";

function link(url: string | undefined, label: string): string {
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>` : "—";
}

function actionMarkup(lead: Lead): string {
  const approve = lead.stage === "demo_ready"
    ? `<button onclick="approve('${escapeHtml(lead.id)}')">Approve outreach</button>`
    : "";
  const contacted = lead.stage === "approved"
    ? (lead.contactEmail
      ? `<button onclick="sendZoho('${escapeHtml(lead.id)}')">Send via Zoho</button><button class="secondary" onclick="stage('${escapeHtml(lead.id)}','contacted')">Mark contacted manually</button>`
      : `<small class="muted">No contact email</small><button class="secondary" onclick="stage('${escapeHtml(lead.id)}','contacted')">Mark contacted manually</button>`)
    : "";
  return approve + contacted;
}

function stageCount(report: ReturnType<typeof buildReport>, stage: keyof typeof report.counts): number {
  return report.counts[stage] ?? 0;
}

export function renderDashboard(leads: Awaited<ReturnType<LeadStore["all"]>>): string {
  const report = buildReport(leads);
  const sorted = [...leads].sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));
  const activeLead = sorted[0];

  const summaryCards = [
    ["Total leads", report.totalLeads, "All discovered prospects"],
    ["Qualified", report.qualifiedOrBeyond, "Ready or moving through pipeline"],
    ["Demo ready", report.counts.demo_ready, "Awaiting human review"],
    ["Approved", report.counts.approved, "Cleared for outreach"],
    ["Won", report.counts.won, "Closed customers"],
    ["Pipeline value", `$${report.projectedPipelineValue.toLocaleString()}`, "Projected opportunity value"]
  ].map(([label, value, hint]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join("");

  const rows = sorted.map((lead) => {
    const evidence = (lead.score?.items ?? []).slice(0, 3).map((item) => escapeHtml(item.label)).join(", ") || "Not scored";
    return `<tr>
      <td><div class="business-cell"><strong>${escapeHtml(lead.businessName)}</strong><small>${escapeHtml(lead.category || "Uncategorized")}</small></div></td>
      <td>${escapeHtml(lead.market || "—")}</td>
      <td><span class="score-dot">${lead.score?.total ?? "—"}</span></td>
      <td><span class="pill">${escapeHtml(lead.stage.replaceAll("_", " "))}</span></td>
      <td class="evidence-cell">${evidence}</td>
      <td>${link(lead.website, "Website ↗")}</td>
      <td><div class="table-actions">${actionMarkup(lead) || `<span class="muted">No action</span>`}</div></td>
    </tr>`;
  }).join("");

  const mobileCards = sorted.map((lead) => {
    const evidence = (lead.score?.items ?? []).slice(0, 3).map((item) => escapeHtml(item.label)).join(" · ") || "Not scored yet";
    const website = lead.website ? link(lead.website, "Open website ↗") : `<span class="muted">No website found</span>`;
    return `<article class="lead-card">
      <div class="lead-card-head">
        <div class="lead-identity"><span class="eyebrow">${escapeHtml(lead.category || "Lead")}</span><h2>${escapeHtml(lead.businessName)}</h2><p>${escapeHtml(lead.market || "Market not set")}</p></div>
        <div class="score-badge"><span>Score</span><strong>${lead.score?.total ?? "—"}</strong></div>
      </div>
      <div class="lead-meta"><span class="pill">${escapeHtml(lead.stage.replaceAll("_", " "))}</span>${website}</div>
      <div class="lead-section"><span class="section-label">Opportunity signals</span><p>${evidence}</p></div>
      <div class="lead-actions">${actionMarkup(lead) || `<span class="muted">No action required at this stage.</span>`}</div>
    </article>`;
  }).join("");

  const emptyState = `<div class="empty-state"><strong>No production leads yet</strong><span>Run a scout command to start the pipeline.</span></div>`;

  const workflow = [
    ["Find", report.totalLeads],
    ["Audit", stageCount(report, "audited")],
    ["Demo", stageCount(report, "demo_ready")],
    ["Approve", stageCount(report, "approved")],
    ["Contact", stageCount(report, "contacted") + stageCount(report, "responded")],
    ["Close", stageCount(report, "won") + stageCount(report, "lost")]
  ].map(([label, count], index) => `<div class="workflow-step"><div class="workflow-index">${String(index + 1).padStart(2, "0")}</div><div><span>${label}</span><strong>${count}</strong></div></div>`).join("");

  const pipeline = [
    ["Audited", stageCount(report, "audited")],
    ["Qualified", stageCount(report, "qualified")],
    ["Demo ready", stageCount(report, "demo_ready")],
    ["Approved", stageCount(report, "approved")],
    ["Contacted", stageCount(report, "contacted")],
    ["Responded", stageCount(report, "responded")],
    ["Proposal", stageCount(report, "proposal")],
    ["Won", stageCount(report, "won")]
  ].map(([label, count]) => `<div class="pipeline-item"><span>${label}</span><strong>${count}</strong></div>`).join("");

  const agents = [
    ["Scout", "Lead discovery", "OSM + Gemini"],
    ["Auditor", "Website analysis", "Deterministic"],
    ["Designer", "Demo concepts", config.geminiApiKey ? "Gemini ready" : "Fallback mode"],
    ["Sales", "Outreach drafts", config.zohoMcpUrl ? "Zoho connected" : "Zoho pending"],
    ["Accounting", "Books review", config.zohoBooksMcpUrl ? "Books connected" : "Books pending"],
    ["Legal", "Review & drafting", config.agentEmails.legal ? "Mailbox ready" : "Mailbox pending"]
  ].map(([name, role, status]) => `<div class="agent-row"><div class="agent-avatar">${name.slice(0, 1)}</div><div class="agent-copy"><strong>${name}</strong><span>${role}</span></div><span class="status-chip">${status}</span></div>`).join("");

  const integrations = [
    ["Gemini", Boolean(config.geminiApiKey), config.scoutModel],
    ["OpenStreetMap", true, `${config.overpassUrls.length} Overpass endpoints`],
    ["Zoho Mail", Boolean(config.zohoMcpUrl), config.zohoMcpUrl ? "MCP connected" : "Not configured"],
    ["Zoho Books", Boolean(config.zohoBooksMcpUrl), config.zohoBooksMcpUrl ? "MCP connected" : "Not configured"]
  ].map(([name, healthy, detail]) => `<div class="integration-row"><div><strong>${name}</strong><span>${detail}</span></div><span class="health ${healthy ? "ok" : "pending"}">${healthy ? "Ready" : "Pending"}</span></div>`).join("");

  const activeWorkspace = activeLead ? `<div class="workspace-card">
    <div class="workspace-top"><div><span class="section-kicker">Top opportunity</span><h3>${escapeHtml(activeLead.businessName)}</h3><p>${escapeHtml(activeLead.market || "Market not set")} · ${escapeHtml(activeLead.category || "Lead")}</p></div><div class="workspace-score"><span>Opportunity</span><strong>${activeLead.score?.total ?? "—"}</strong></div></div>
    <div class="workspace-grid"><div><span>Stage</span><strong>${escapeHtml(activeLead.stage.replaceAll("_", " "))}</strong></div><div><span>Website</span><strong>${activeLead.website ? "Found" : "Not found"}</strong></div><div><span>Package</span><strong>${escapeHtml(activeLead.salesAssets?.recommendedPackage || "Launch")}</strong></div></div>
    <div class="workspace-actions">${actionMarkup(activeLead) || `<span class="muted">Audit, qualify, or generate a demo to unlock the next action.</span>`}</div>
  </div>` : emptyState;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>TechTactics Web Growth Command Center</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f5f7fb;font-synthesis:none;--nav:#0b1220;--nav2:#111b2e;--ink:#101828;--muted:#667085;--line:#e4e7ec;--blue:#2e6bff;--blue-soft:#edf3ff;--green:#067647;--green-soft:#ecfdf3}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f5f7fb;color:var(--ink)}a{color:#245acb;text-decoration:none;font-weight:700}a:hover{text-decoration:underline}button{border:0;border-radius:10px;padding:10px 12px;background:#172033;color:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:760;min-height:40px}button.secondary{background:#eef2f7;color:#344054}button:hover{filter:brightness(.97)}button:focus-visible,a:focus-visible{outline:3px solid #84adff;outline-offset:2px}.app-shell{min-height:100vh;display:grid;grid-template-columns:238px minmax(0,1fr)}.sidebar{background:linear-gradient(180deg,var(--nav),#09101c);color:#fff;position:sticky;top:0;height:100vh;padding:22px 16px;display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,.06)}.brand{display:flex;align-items:center;gap:11px;padding:5px 8px 24px}.brand-mark{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#3b82f6,#75a7ff);font-weight:900;box-shadow:0 10px 24px rgba(46,107,255,.28)}.brand-copy strong{display:block;font-size:14px}.brand-copy span{display:block;color:#8fa0ba;font-size:10px;margin-top:2px;letter-spacing:.05em;text-transform:uppercase}.nav-group-label{color:#667892;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:8px 10px}.side-nav{display:grid;gap:4px}.side-nav a{color:#aab6c8;font-weight:650;font-size:13px;padding:10px 11px;border-radius:9px;display:flex;align-items:center;gap:9px}.side-nav a:before{content:"";width:7px;height:7px;border-radius:50%;background:#44536a}.side-nav a:first-child,.side-nav a:hover{background:var(--nav2);color:#fff;text-decoration:none}.side-nav a:first-child:before{background:#5d93ff;box-shadow:0 0 0 4px rgba(93,147,255,.13)}.sidebar-foot{margin-top:auto;border-top:1px solid rgba(255,255,255,.08);padding:16px 9px 4px;color:#7f8da2;font-size:11px;line-height:1.5}.main{min-width:0}.topbar{height:66px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:5}.topbar strong{font-size:14px}.topbar .live{display:flex;align-items:center;gap:8px;color:#475467;font-size:12px}.live-dot{width:8px;height:8px;border-radius:50%;background:#12b76a;box-shadow:0 0 0 4px #d1fadf}.content{width:min(1520px,calc(100% - 48px));margin:0 auto;padding:30px 0 56px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.hero .eyebrow{font-size:11px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;color:#3265c7}.hero h1{font-size:clamp(28px,3vw,40px);line-height:1.05;letter-spacing:-.04em;margin:9px 0 8px}.hero p{margin:0;color:var(--muted);font-size:14px;max-width:700px}.approval-note{padding:12px 14px;border:1px solid #d6e2f5;background:#fff;border-radius:12px;color:#475467;font-size:12px;max-width:330px;box-shadow:0 1px 2px rgba(16,24,40,.03)}.metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:11px;margin:25px 0}.metric-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(16,24,40,.025)}.metric-card>span{font-size:11px;color:#667085;font-weight:700}.metric-card strong{display:block;font-size:25px;letter-spacing:-.035em;margin:8px 0 4px}.metric-card small{font-size:10px;color:#98a2b3;line-height:1.3}.section{margin-top:20px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 2px 10px}.section-head h2{margin:0;font-size:16px;letter-spacing:-.01em}.section-head p{margin:3px 0 0;color:#98a2b3;font-size:11px}.workflow{display:grid;grid-template-columns:repeat(6,1fr);background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}.workflow-step{padding:15px;display:flex;align-items:center;gap:10px;border-right:1px solid #edf0f4}.workflow-step:last-child{border-right:0}.workflow-index{width:27px;height:27px;border-radius:8px;background:#f2f5f9;display:grid;place-items:center;font-size:9px;color:#667085;font-weight:850}.workflow-step span{display:block;font-size:11px;color:#667085;font-weight:700}.workflow-step strong{display:block;font-size:17px;margin-top:2px}.overview-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(310px,.85fr);gap:14px}.panel{background:#fff;border:1px solid var(--line);border-radius:15px;box-shadow:0 1px 3px rgba(16,24,40,.025);overflow:hidden}.panel-pad{padding:17px}.pipeline-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pipeline-item{padding:12px;border:1px solid #edf0f4;border-radius:11px;background:#fafbfd}.pipeline-item span{display:block;color:#667085;font-size:10px;font-weight:700}.pipeline-item strong{display:block;font-size:20px;margin-top:5px}.workspace-card{padding:18px}.workspace-top{display:flex;justify-content:space-between;gap:18px}.section-kicker{font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#3265c7}.workspace-top h3{margin:5px 0 4px;font-size:20px}.workspace-top p{margin:0;color:#667085;font-size:12px}.workspace-score{width:66px;height:66px;border-radius:15px;background:var(--blue-soft);display:grid;place-content:center;text-align:center;flex:0 0 auto}.workspace-score span{font-size:8px;color:#667085;text-transform:uppercase;font-weight:800}.workspace-score strong{font-size:23px;color:#1849a9}.workspace-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:17px}.workspace-grid>div{padding:11px;border:1px solid #edf0f4;border-radius:10px}.workspace-grid span{display:block;font-size:9px;color:#98a2b3;text-transform:uppercase;font-weight:800}.workspace-grid strong{display:block;font-size:12px;margin-top:4px;text-transform:capitalize}.workspace-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:15px}.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.agent-row,.integration-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #edf0f4}.agent-row:last-child,.integration-row:last-child{border-bottom:0}.agent-avatar{width:32px;height:32px;border-radius:10px;background:#eef4ff;color:#1849a9;display:grid;place-items:center;font-size:12px;font-weight:850}.agent-copy{min-width:0;flex:1}.agent-copy strong,.integration-row strong{display:block;font-size:12px}.agent-copy span,.integration-row span:not(.health){display:block;font-size:10px;color:#98a2b3;margin-top:2px}.status-chip{font-size:9px!important;background:#f2f4f7;color:#475467!important;border-radius:999px;padding:5px 7px;white-space:nowrap}.integration-row>div{flex:1}.health{font-size:9px;font-weight:800;border-radius:999px;padding:5px 8px}.health.ok{background:var(--green-soft);color:var(--green)}.health.pending{background:#fff4ed;color:#b54708}.desktop-table{display:block;overflow:auto}.mobile-leads{display:none}table{border-collapse:collapse;width:100%;min-width:1050px}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #edf0f4;vertical-align:middle}tr:last-child td{border-bottom:0}th{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#667085;background:#fafbfd;position:sticky;top:0}.business-cell strong{display:block;font-size:12px}.business-cell small{display:block;color:#98a2b3;margin-top:3px}.score-dot{display:inline-grid;place-items:center;min-width:34px;height:29px;padding:0 7px;border-radius:9px;background:#eef4ff;color:#1849a9;font-size:12px;font-weight:850}.pill{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;background:#f2f4f7;color:#344054;font-size:9px;font-weight:800;text-transform:capitalize;white-space:nowrap}.evidence-cell{max-width:310px;color:#475467;font-size:11px;line-height:1.45}.table-actions{display:flex;flex-wrap:wrap;gap:5px;min-width:150px}.muted{color:#98a2b3;font-size:11px}.empty-state{padding:34px;text-align:center;color:#98a2b3}.empty-state strong{display:block;color:#344054;font-size:16px;margin-bottom:5px}.lead-card{display:none}
@media(max-width:1200px){.metrics{grid-template-columns:repeat(3,1fr)}.workflow{grid-template-columns:repeat(3,1fr)}.workflow-step:nth-child(3){border-right:0}.workflow-step:nth-child(-n+3){border-bottom:1px solid #edf0f4}.overview-grid{grid-template-columns:1fr}.pipeline-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:900px){.app-shell{grid-template-columns:190px minmax(0,1fr)}.content{width:calc(100% - 32px)}.split-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){html{scroll-behavior:auto}.app-shell{display:block}.sidebar{position:relative;height:auto;padding:12px}.brand{padding:4px 5px 12px}.nav-group-label,.sidebar-foot{display:none}.side-nav{display:flex;overflow-x:auto;gap:5px;padding-bottom:3px;scrollbar-width:none}.side-nav::-webkit-scrollbar{display:none}.side-nav a{flex:0 0 auto;padding:8px 10px;background:#111b2e;color:#aab6c8}.side-nav a:first-child{color:#fff}.side-nav a:before{display:none}.topbar{height:54px;padding:0 14px;position:relative}.content{width:calc(100% - 24px);padding:18px 0 32px}.hero{display:block}.approval-note{margin-top:13px;max-width:none}.metrics{grid-template-columns:repeat(2,1fr);gap:8px;margin:18px 0}.metric-card{padding:13px}.metric-card strong{font-size:21px}.workflow{grid-template-columns:repeat(2,1fr)}.workflow-step{border-right:1px solid #edf0f4;border-bottom:1px solid #edf0f4!important}.workflow-step:nth-child(even){border-right:0}.workflow-step:nth-last-child(-n+2){border-bottom:0!important}.pipeline-grid{grid-template-columns:repeat(2,1fr)}.workspace-grid{grid-template-columns:1fr 1fr}.workspace-grid>div:last-child{grid-column:1/-1}.desktop-table{display:none}.mobile-leads{display:grid;gap:10px}.lead-card{display:block;background:#fff;border:1px solid var(--line);border-radius:15px;padding:15px}.lead-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.lead-identity{min-width:0}.lead-card .eyebrow{display:block;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#667085;margin-bottom:4px}.lead-card h2{margin:0;font-size:17px;line-height:1.2;overflow-wrap:anywhere}.lead-card p{margin:4px 0 0;color:#98a2b3;font-size:11px}.score-badge{width:55px;height:55px;border-radius:13px;background:#eef4ff;display:grid;place-content:center;text-align:center;flex:0 0 auto}.score-badge span{font-size:8px;text-transform:uppercase;color:#667085;font-weight:800}.score-badge strong{font-size:20px;color:#1849a9}.lead-meta{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:12px 0;border-bottom:1px solid #edf0f4}.lead-meta a{font-size:10px}.lead-section{padding:12px 0 3px}.section-label{font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#667085}.lead-section p{margin-top:5px;color:#475467;font-size:11px;line-height:1.45}.lead-actions{display:grid;gap:7px;padding-top:11px}.lead-actions button{width:100%;min-height:44px;margin:0;font-size:12px}.lead-actions .muted{text-align:center;padding:4px}.split-grid{gap:10px}.section{margin-top:16px}}
@media(max-width:390px){.metrics{grid-template-columns:1fr 1fr}.metric-card{padding:11px}.metric-card small{display:none}.workspace-grid{grid-template-columns:1fr}.workspace-grid>div:last-child{grid-column:auto}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style></head>
<body><div class="app-shell">
<aside class="sidebar"><div class="brand"><div class="brand-mark">TT</div><div class="brand-copy"><strong>TechTactics</strong><span>Growth OS</span></div></div><div class="nav-group-label">Command center</div><nav class="side-nav"><a href="#overview">Overview</a><a href="#pipeline">Pipeline</a><a href="#leads">Leads</a><a href="#agents">Agents</a><a href="#inbox">Inbox</a><a href="#accounting">Accounting</a><a href="#legal">Legal</a><a href="#integrations">Integrations</a></nav><div class="sidebar-foot">Human approval stays between demo creation and customer outreach.</div></aside>
<div class="main"><header class="topbar"><strong>Web Growth Command Center</strong><div class="live"><span class="live-dot"></span>Operations online</div></header>
<main class="content" id="overview"><section class="hero"><div><span class="eyebrow">Website growth operations</span><h1>Web Growth Command Center</h1><p>Find local opportunities, audit the evidence, build a tailored demo, approve outreach, and move qualified prospects through one operating loop.</p></div><div class="approval-note">Nothing is sent automatically. Approve and Send remain separate human-controlled actions.</div></section>
<div class="metrics">${summaryCards}</div>
<section class="section"><div class="section-head"><div><h2>Operating workflow</h2><p>Find → Audit → Demo → Approve → Contact → Close</p></div></div><div class="workflow">${workflow}</div></section>
<section class="section overview-grid" id="pipeline"><div class="panel panel-pad"><div class="section-head"><div><h2>Pipeline</h2><p>Current distribution across active sales stages.</p></div></div><div class="pipeline-grid">${pipeline}</div></div><div class="panel">${activeWorkspace}</div></section>
<section class="section" id="leads"><div class="section-head"><div><h2>Lead workspace</h2><p>Highest-scoring opportunities first. Evidence before outreach.</p></div><span class="muted">${report.totalLeads} leads</span></div>${leads.length ? `<div class="panel desktop-table"><table><thead><tr><th>Business</th><th>Market</th><th>Score</th><th>Stage</th><th>Evidence</th><th>Link</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><section class="mobile-leads">${mobileCards}</section>` : emptyState}</section>
<section class="section split-grid"><div class="panel panel-pad" id="agents"><div class="section-head"><div><h2>Agent Operations</h2><p>Specialized workers with clear lanes and controlled tools.</p></div></div>${agents}</div><div class="panel panel-pad" id="integrations"><div class="section-head"><div><h2>Integration Health</h2><p>External systems available to the operating team.</p></div></div>${integrations}</div></section>
<section class="section split-grid"><div class="panel panel-pad" id="inbox"><div class="section-head"><div><h2>Inbox</h2><p>Zoho prospect replies and follow-up review.</p></div></div><span class="muted">${config.zohoMcpUrl ? "Zoho Mail is configured for reviewed reads/replies." : "Connect Zoho Mail MCP to surface prospect conversations here."}</span></div><div class="panel panel-pad"><div id="accounting"><div class="section-head"><div><h2>Accounting</h2><p>Read-only Zoho Books support.</p></div></div><span class="muted">${config.zohoBooksMcpUrl ? "Accounting assistant connection is configured." : "Zoho Books MCP is not configured yet."}</span></div><div id="legal" style="margin-top:18px;padding-top:18px;border-top:1px solid #edf0f4"><div class="section-head"><div><h2>Legal</h2><p>Drafting, issue spotting, and owner review.</p></div></div><span class="muted">Binding decisions remain with TechTactics ownership and qualified professionals.</span></div></div></section>
</main></div></div>
<script>
async function approve(id){const r=await fetch('/api/leads/'+encodeURIComponent(id)+'/approve',{method:'POST'});if(!r.ok)alert(await r.text());else location.reload();}
async function sendZoho(id){if(!confirm('Send the approved outreach email through Zoho now?'))return;const r=await fetch('/api/leads/'+encodeURIComponent(id)+'/send',{method:'POST'});if(!r.ok)alert(await r.text());else location.reload();}
async function stage(id,next){const r=await fetch('/api/leads/'+encodeURIComponent(id)+'/stage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:next})});if(!r.ok)alert(await r.text());else location.reload();}
</script></body></html>`;
}

export async function startServer(store = new LeadStore()): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/", async (_req, res) => res.type("html").send(renderDashboard(await store.all())));
  app.get("/api/leads", async (_req, res) => res.json(await store.all()));
  app.get("/api/report", async (_req, res) => res.json(buildReport(await store.all())));

  app.post("/api/leads/:id/approve", async (req, res) => {
    try {
      res.json(await approveLead(req.params.id, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.post("/api/leads/:id/send", async (req, res) => {
    try {
      res.json(await sendApprovedOutreach(req.params.id, { store }));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.post("/api/leads/:id/stage", async (req, res) => {
    try {
      res.json(await setLeadStage(req.params.id, req.body.stage as LeadStage, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      console.log(`TechTactics Web Growth Command Center: http://${config.host}:${config.port}`);
      resolve();
    });
  });
}
