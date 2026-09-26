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

export function renderDashboard(leads: Awaited<ReturnType<LeadStore["all"]>>): string {
  const report = buildReport(leads);
  const summaryCards = [
    ["Total leads", report.totalLeads],
    ["Qualified + pipeline", report.qualifiedOrBeyond],
    ["Demo ready", report.counts.demo_ready],
    ["Approved", report.counts.approved],
    ["Won", report.counts.won],
    ["Pipeline value", `$${report.projectedPipelineValue.toLocaleString()}`]
  ].map(([label, value]) => `<div class="metric-card"><small>${label}</small><strong>${value}</strong></div>`).join("");

  const sorted = [...leads].sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));

  const rows = sorted.map((lead) => {
    const evidence = (lead.score?.items ?? []).slice(0, 3).map((item) => escapeHtml(item.label)).join(", ") || "Not scored";
    return `<tr>
      <td><strong>${escapeHtml(lead.businessName)}</strong><br><small>${escapeHtml(lead.category || "")}</small></td>
      <td>${escapeHtml(lead.market || "")}</td>
      <td class="score">${lead.score?.total ?? "—"}</td>
      <td><span class="pill">${escapeHtml(lead.stage)}</span></td>
      <td>${evidence}</td>
      <td>${link(lead.website, "Website")}</td>
      <td><div class="table-actions">${actionMarkup(lead)}</div></td>
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
      <div class="lead-meta"><span class="pill">${escapeHtml(lead.stage)}</span>${website}</div>
      <div class="lead-section"><span class="section-label">Opportunity signals</span><p>${evidence}</p></div>
      <div class="lead-actions">${actionMarkup(lead) || `<span class="muted">No action required at this stage.</span>`}</div>
    </article>`;
  }).join("");

  const emptyState = `<div class="empty-state"><strong>No leads yet</strong><span>Run a scout command to start building the pipeline.</span></div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>TechTactics Web Growth Agent</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f7fb;font-synthesis:none}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#eef4ff 0,#f7f9fc 240px,#f7f9fc 100%);color:#172033}.wrap{width:min(1400px,calc(100% - 40px));margin:32px auto 56px}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:24px 0 4px}.brand-kicker{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#175cd3}.brand-kicker:before{content:"";width:8px;height:8px;border-radius:50%;background:#175cd3;box-shadow:0 0 0 5px #dbeafe}.hero h1{margin:12px 0 7px;font-size:clamp(28px,3vw,42px);line-height:1.05;letter-spacing:-.035em}.sub{color:#667085;margin:0;font-size:15px}.hero-note{max-width:360px;padding:13px 15px;border:1px solid #d7e3f4;background:rgba(255,255,255,.78);backdrop-filter:blur(8px);border-radius:14px;color:#475467;font-size:13px;line-height:1.45}.cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin:26px 0}.metric-card{background:rgba(255,255,255,.94);border:1px solid #e3e9f2;border-radius:16px;padding:17px;box-shadow:0 1px 2px rgba(16,24,40,.04)}.metric-card small{display:block;color:#667085;font-size:12px;font-weight:650}.metric-card strong{display:block;font-size:26px;line-height:1.1;margin-top:10px;letter-spacing:-.025em}.panel{background:#fff;border:1px solid #e3e9f2;border-radius:18px;box-shadow:0 10px 30px rgba(16,24,40,.045);overflow:hidden}.desktop-table{display:block;overflow:auto}.mobile-leads{display:none}table{border-collapse:collapse;width:100%;min-width:1000px}th,td{padding:15px 16px;text-align:left;border-bottom:1px solid #eef1f5;vertical-align:top}tr:last-child td{border-bottom:0}th{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#667085;background:#fafbfd;position:sticky;top:0}.score{font-size:22px;font-weight:800}.pill{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#eef4ff;color:#1849a9;font-size:11px;font-weight:750;text-transform:capitalize}.table-actions{display:flex;flex-wrap:wrap;gap:6px;min-width:170px}button{border:0;border-radius:9px;padding:9px 11px;background:#172033;color:white;cursor:pointer;font:inherit;font-size:12px;font-weight:700;min-height:38px}button.secondary{background:#eef2f7;color:#344054}button:hover{filter:brightness(.96)}button:focus-visible,a:focus-visible{outline:3px solid #84adff;outline-offset:2px}a{color:#175cd3;font-weight:700;text-decoration:none}a:hover{text-decoration:underline}.muted{color:#667085}.empty-state{padding:40px;display:grid;gap:6px;text-align:center;color:#667085}.empty-state strong{color:#344054;font-size:18px}
@media(max-width:1100px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){body{background:linear-gradient(180deg,#edf4ff 0,#f7f9fc 190px,#f7f9fc 100%)}.wrap{width:calc(100% - 24px);margin:14px auto 32px}.hero{display:block;padding:15px 2px 0}.hero-note{margin-top:16px;max-width:none}.hero h1{font-size:31px;max-width:12ch}.sub{font-size:14px;line-height:1.5}.cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:19px 0}.metric-card{padding:13px;border-radius:14px}.metric-card strong{font-size:22px}.desktop-table{display:none}.mobile-leads{display:grid;gap:12px}.lead-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px;box-shadow:0 7px 22px rgba(16,24,40,.055)}.lead-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.lead-identity{min-width:0}.eyebrow{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667085;margin-bottom:5px}.lead-card h2{margin:0;font-size:19px;line-height:1.2;letter-spacing:-.02em;overflow-wrap:anywhere}.lead-card p{margin:5px 0 0;color:#667085;font-size:13px;line-height:1.45}.score-badge{flex:0 0 58px;height:58px;border-radius:16px;background:#f1f5ff;display:grid;place-content:center;text-align:center}.score-badge span{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667085}.score-badge strong{font-size:21px;line-height:1;color:#1849a9}.lead-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 0;border-bottom:1px solid #eef1f5}.lead-meta a{font-size:12px}.lead-section{padding:14px 0 4px}.section-label{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667085}.lead-section p{margin-top:6px;color:#344054}.lead-actions{display:grid;gap:8px;padding-top:12px}.lead-actions button{width:100%;min-height:44px;margin:0;font-size:13px}.lead-actions .muted{font-size:12px;text-align:center;padding:4px}.empty-state{padding:32px 16px}}
@media(max-width:390px){.cards{grid-template-columns:1fr 1fr}.metric-card{padding:12px}.metric-card small{font-size:11px}.metric-card strong{font-size:20px}.lead-card{padding:14px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style></head>
<body><main class="wrap"><section class="hero"><div><span class="brand-kicker">TechTactics</span><h1>Web Growth Agent</h1><p class="sub">Local lead pipeline with evidence-based scoring and human-approved outreach.</p></div><div class="hero-note">Review the opportunity, verify the evidence, then approve outreach. Nothing is sent automatically.</div></section>
<div class="cards">${summaryCards}</div>
${leads.length ? `<div class="panel desktop-table"><table><thead><tr><th>Business</th><th>Market</th><th>Score</th><th>Stage</th><th>Evidence</th><th>Links</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><section class="mobile-leads">${mobileCards}</section>` : emptyState}
</main>
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
      console.log(`TechTactics Web Growth Agent dashboard: http://${config.host}:${config.port}`);
      resolve();
    });
  });
}
