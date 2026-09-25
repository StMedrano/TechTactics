import express from "express";
import { config } from "./config.js";
import { approveLead, setLeadStage } from "./pipeline.js";
import { buildReport } from "./report.js";
import { LeadStore } from "./store.js";
import type { LeadStage } from "./types.js";
import { escapeHtml } from "./utils.js";

function link(url: string | undefined, label: string): string {
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>` : "—";
}

function renderDashboard(leads: Awaited<ReturnType<LeadStore["all"]>>): string {
  const report = buildReport(leads);
  const cards = [
    ["Total leads", report.totalLeads],
    ["Qualified + pipeline", report.qualifiedOrBeyond],
    ["Demo ready", report.counts.demo_ready],
    ["Approved", report.counts.approved],
    ["Won", report.counts.won],
    ["Pipeline value", `$${report.projectedPipelineValue.toLocaleString()}`]
  ].map(([label, value]) => `<div class="card"><small>${label}</small><strong>${value}</strong></div>`).join("");

  const rows = [...leads]
    .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1))
    .map((lead) => {
      const evidence = (lead.score?.items ?? []).slice(0, 3).map((item) => escapeHtml(item.label)).join(", ") || "Not scored";
      const approve = lead.stage === "demo_ready"
        ? `<button onclick="approve('${escapeHtml(lead.id)}')">Approve outreach</button>`
        : "";
      const contacted = lead.stage === "approved"
        ? `<button onclick="stage('${escapeHtml(lead.id)}','contacted')">Mark contacted</button>`
        : "";
      return `<tr>
        <td><strong>${escapeHtml(lead.businessName)}</strong><br><small>${escapeHtml(lead.category || "")}</small></td>
        <td>${escapeHtml(lead.market || "")}</td>
        <td class="score">${lead.score?.total ?? "—"}</td>
        <td><span class="pill">${escapeHtml(lead.stage)}</span></td>
        <td>${evidence}</td>
        <td>${link(lead.website, "Website")} ${link(lead.googleMapsUrl, "Map")}</td>
        <td>${approve} ${contacted}</td>
      </tr>`;
    }).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TechTactics Web Growth Agent</title>
<style>
body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f5f7fb;color:#172033}.wrap{width:min(1400px,calc(100% - 36px));margin:36px auto}
h1{margin-bottom:6px}.sub{color:#667085;margin-top:0}.cards{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:28px 0}
.card{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px}.card small{display:block;color:#667085}.card strong{display:block;font-size:28px;margin-top:8px}
.panel{overflow:auto;background:white;border:1px solid #e5e7eb;border-radius:14px}table{border-collapse:collapse;width:100%;min-width:1000px}th,td{padding:14px;text-align:left;border-bottom:1px solid #eef0f3;vertical-align:top}
th{font-size:12px;text-transform:uppercase;color:#667085}.score{font-size:24px;font-weight:800}.pill{padding:5px 8px;border-radius:999px;background:#eef2ff;font-size:12px}
button{border:0;border-radius:8px;padding:8px 10px;background:#111827;color:white;cursor:pointer;margin:2px}a{color:#175cd3}@media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}}
</style></head>
<body><div class="wrap"><h1>TechTactics Web Growth Agent</h1><p class="sub">Local lead pipeline. Outreach remains human-approved.</p>
<div class="cards">${cards}</div><div class="panel"><table><thead><tr><th>Business</th><th>Market</th><th>Score</th><th>Stage</th><th>Evidence</th><th>Links</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
</div>
<script>
async function approve(id){const r=await fetch('/api/leads/'+encodeURIComponent(id)+'/approve',{method:'POST'}); if(!r.ok) alert(await r.text()); else location.reload();}
async function stage(id,next){const r=await fetch('/api/leads/'+encodeURIComponent(id)+'/stage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:next})}); if(!r.ok) alert(await r.text()); else location.reload();}
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

  app.post("/api/leads/:id/stage", async (req, res) => {
    try {
      res.json(await setLeadStage(req.params.id, req.body.stage as LeadStage, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise<void>((resolve) => {
    app.listen(config.port, "127.0.0.1", () => {
      console.log(`TechTactics Web Growth Agent dashboard: http://127.0.0.1:${config.port}`);
      resolve();
    });
  });
}
