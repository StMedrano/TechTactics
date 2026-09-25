import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import type { Lead, SalesAssets } from "./types.js";
import { escapeHtml } from "./utils.js";

function contactHtml(lead: Lead): string {
  const parts: string[] = [];
  if (lead.phone) parts.push(`<a class="button" href="tel:${escapeHtml(lead.phone)}">Call ${escapeHtml(lead.phone)}</a>`);
  parts.push('<a class="button secondary" href="#contact">Request information</a>');
  return parts.join("");
}

function demoHtml(lead: Lead, assets: SalesAssets): string {
  const business = escapeHtml(lead.businessName);
  const address = lead.address ? escapeHtml(lead.address) : "";
  const services = assets.demoServices.map((service) => `
    <article class="card">
      <h3>${escapeHtml(service)}</h3>
      <p>Concept content for a future TechTactics-built site. Final wording would be confirmed with the business.</p>
    </article>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${business} — TechTactics concept preview</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#122033;background:#f7f9fc}
    *{box-sizing:border-box}body{margin:0}.wrap{width:min(1120px,calc(100% - 40px));margin:auto}
    .concept{padding:10px 20px;text-align:center;background:#111827;color:white;font-size:14px}
    header{padding:26px 0;background:white;border-bottom:1px solid #e5e7eb}.nav{display:flex;justify-content:space-between;align-items:center;gap:20px}
    .brand{font-weight:800;font-size:20px}.hero{padding:88px 0;background:linear-gradient(135deg,#eef6ff,#f8fafc)}
    h1{font-size:clamp(40px,7vw,76px);line-height:.98;max-width:850px;margin:0 0 22px;letter-spacing:-.04em}
    .lead{font-size:20px;line-height:1.6;max-width:720px;color:#44536a}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
    .button{display:inline-block;padding:14px 18px;border-radius:10px;background:#111827;color:white;text-decoration:none;font-weight:700}
    .secondary{background:white;color:#111827;border:1px solid #d1d5db}.section{padding:72px 0}.muted{color:#5b677a}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.card{background:white;padding:26px;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(15,23,42,.05)}
    .contact{padding:36px;border-radius:22px;background:#111827;color:white}.contact .muted{color:#cbd5e1}
    footer{padding:32px 0 50px;color:#64748b;font-size:14px}@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{padding:64px 0}.nav{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <div class="concept">Private concept preview created by TechTactics — this is not an official ${business} website.</div>
  <header><div class="wrap nav"><div class="brand">${business}</div><div class="muted">${address}</div></div></header>
  <main>
    <section class="hero"><div class="wrap">
      <p class="muted">${escapeHtml(lead.category || "Local business")}</p>
      <h1>${escapeHtml(assets.demoHeadline)}</h1>
      <p class="lead">${escapeHtml(assets.demoSubheadline)}</p>
      <div class="actions">${contactHtml(lead)}</div>
    </div></section>
    <section class="section"><div class="wrap">
      <h2>Services customers can understand quickly</h2>
      <p class="muted">This section demonstrates a clearer content structure. Final service names and descriptions must be confirmed by the business.</p>
      <div class="grid">${services}</div>
    </div></section>
    <section class="section" id="contact"><div class="wrap">
      <div class="contact">
        <h2>Make the next step obvious.</h2>
        <p class="muted">A production website could route calls, quote requests, bookings, or inquiries into the workflow the business actually uses.</p>
        <div class="actions">${contactHtml(lead)}</div>
      </div>
    </div></section>
  </main>
  <footer><div class="wrap">TechTactics concept preview. All business facts and final copy require client confirmation before publication.</div></footer>
</body>
</html>`;
}

export async function writeLeadArtifacts(lead: Lead, assets: SalesAssets): Promise<{ demoPath: string; directory: string }> {
  const directory = path.join(config.artifactDir, lead.id);
  const demoDirectory = path.join(directory, "demo");
  await mkdir(demoDirectory, { recursive: true });

  await Promise.all([
    writeFile(path.join(demoDirectory, "index.html"), demoHtml(lead, assets), "utf8"),
    writeFile(path.join(directory, "proposal.md"), assets.proposalMarkdown, "utf8"),
    writeFile(path.join(directory, "outreach-draft.txt"), assets.outreachDraft + "\n", "utf8"),
    writeFile(path.join(directory, "business-summary.txt"), assets.businessSummary + "\n", "utf8")
  ]);

  return { demoPath: path.join(demoDirectory, "index.html"), directory };
}
