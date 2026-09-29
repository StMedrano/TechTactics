import { config } from "./config.js";
import {
  dashboardStageOrder,
  type DashboardViewModel,
} from "./dashboard-model.js";
import { recommendPackage } from "./packages.js";
import type { Lead, LeadStage } from "./types.js";
import { escapeHtml } from "./utils.js";

function stageLabel(stage: LeadStage): string {
  return stage.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function stageTone(stage: LeadStage): string {
  if (stage === "approved" || stage === "demo_ready") return "status-attention";
  if (stage === "won") return "status-ready";
  if (stage === "lost") return "status-danger";
  return "";
}

function packageValue(lead: Lead): number {
  const packageName = lead.salesAssets?.recommendedPackage ?? recommendPackage(lead).name;
  if (packageName === "Pro") return 4000;
  if (packageName === "Growth") return 2000;
  return 1000;
}

function nextStep(lead: Lead): string {
  switch (lead.stage) {
    case "new": return "Run audit";
    case "audited": return "Review evidence";
    case "qualified": return "Build preview";
    case "demo_ready": return "Review preview";
    case "approved": return lead.contactEmail ? "Send through Zoho" : "Add contact email";
    case "contacted": return "Wait for reply";
    case "responded": return "Prepare proposal";
    case "proposal": return "Follow up";
    case "won": return "Begin onboarding";
    case "lost": return "Review outcome";
  }
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function leadLocation(lead: Lead): string {
  return [lead.category || "Local business", lead.market || "Market pending"].join(" · ");
}

function integrationState(): Array<{ name: string; detail: string; ready: boolean; permission: string }> {
  return [
    {
      name: "Zoho Mail",
      detail: config.zohoMcpUrl ? "Connected" : "Not configured",
      ready: Boolean(config.zohoMcpUrl),
      permission: "Human approval required",
    },
    {
      name: "Zoho Books",
      detail: config.zohoBooksMcpUrl ? "Connected" : "Not configured",
      ready: Boolean(config.zohoBooksMcpUrl),
      permission: "Read only",
    },
    {
      name: "AI provider",
      detail: config.groqApiKey || config.geminiApiKey ? "Configured" : "Not configured",
      ready: Boolean(config.groqApiKey || config.geminiApiKey),
      permission: "Draft and design support",
    },
    {
      name: "OpenStreetMap",
      detail: `${config.overpassUrls.length} endpoint${config.overpassUrls.length === 1 ? "" : "s"} configured`,
      ready: config.overpassUrls.length > 0,
      permission: "Discovery data",
    },
  ];
}

function renderOverview(model: DashboardViewModel): string {
  const integrations = integrationState();
  const configured = integrations.filter((item) => item.ready).length;
  const pipelineStages: LeadStage[] = ["audited", "qualified", "demo_ready", "approved"];
  const maxStageCount = Math.max(
    1,
    ...pipelineStages.map((stage) => model.report.counts[stage]),
  );

  const work = model.priorityWork.length
    ? model.priorityWork
        .map(
          (lead, index) => `<a class="work-item" data-searchable href="/leads/${encodeURIComponent(lead.id)}">
            <span class="work-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="work-copy"><strong>${escapeHtml(nextStep(lead))}: ${escapeHtml(lead.businessName)}</strong><span>${escapeHtml(leadLocation(lead))}</span></span>
            <span class="status ${stageTone(lead.stage)}">${escapeHtml(stageLabel(lead.stage))}</span>
          </a>`,
        )
        .join("")
    : `<div class="empty-state"><strong>No work is waiting</strong><p>Newly discovered leads and approval tasks will appear here.</p></div>`;

  return `<section class="kpi-grid" aria-label="Quick look">
    <article class="kpi"><span class="kpi-label">Needs your attention</span><strong>${model.metrics.ownerAttention}</strong><small>Preview approvals and approved outreach</small></article>
    <article class="kpi"><span class="kpi-label">Active leads</span><strong>${model.metrics.activeLeads}</strong><small>${model.metrics.totalLeads} total records</small></article>
    <article class="kpi"><span class="kpi-label">Pipeline value</span><strong>${money(model.metrics.projectedPipelineValue)}</strong><small>Projected from active packages</small></article>
    <article class="kpi"><span class="kpi-label">Core services</span><strong>${configured}/${integrations.length}</strong><small>Configured, not a live uptime claim</small></article>
  </section>
  <div class="overview-grid">
    <section class="surface"><header class="section-head"><h2>Next best work</h2><a class="text-button" href="/leads">View all leads</a></header><div class="work-list">${work}</div></section>
    <aside>
      <section class="surface"><header class="section-head"><h2>Pipeline snapshot</h2><a class="text-button" href="/pipeline">Open pipeline</a></header><div class="pipeline-mini">${pipelineStages
        .map((stage) => {
          const count = model.report.counts[stage];
          const width = Math.round((count / maxStageCount) * 100);
          return `<div class="pipeline-row"><span>${escapeHtml(stageLabel(stage))}</span><div class="pipeline-track"><div class="pipeline-fill" style="width:${width}%"></div></div><strong>${count}</strong></div>`;
        })
        .join("")}</div></section>
      <div class="health-note"><span aria-hidden="true">✓</span><span><strong>Integration health:</strong> ${configured} of ${integrations.length} services are configured.</span></div>
    </aside>
  </div>`;
}

function renderLeadTable(model: DashboardViewModel): string {
  if (!model.leads.length) {
    return `<section class="surface"><div class="empty-state"><strong>No leads yet</strong><p>Run Scout from the existing command workflow to add verified opportunities.</p></div></section>`;
  }

  const rows = model.leads
    .map(
      (lead) => `<tr data-searchable><td class="business-name"><strong>${escapeHtml(lead.businessName)}</strong><span>${escapeHtml(leadLocation(lead))}</span></td><td>${lead.score?.total ?? "—"}</td><td><span class="status ${stageTone(lead.stage)}">${escapeHtml(stageLabel(lead.stage))}</span></td><td>${money(packageValue(lead))}</td><td>${escapeHtml(nextStep(lead))}</td><td><a class="text-button" href="/leads/${encodeURIComponent(lead.id)}">Open workspace</a></td></tr>`,
    )
    .join("");
  const cards = model.leads
    .map(
      (lead) => `<article class="lead-card" data-searchable><div class="lead-card-head"><div><h2>${escapeHtml(lead.businessName)}</h2><p>${escapeHtml(leadLocation(lead))}</p></div><span class="status ${stageTone(lead.stage)}">${escapeHtml(stageLabel(lead.stage))}</span></div><div class="lead-card-grid"><div><span>Score</span><strong>${lead.score?.total ?? "—"}</strong></div><div><span>Value</span><strong>${money(packageValue(lead))}</strong></div><div><span>Next</span><strong>${escapeHtml(nextStep(lead))}</strong></div></div><div class="card-actions"><a class="button-secondary" href="/leads/${encodeURIComponent(lead.id)}">Open workspace</a></div></article>`,
    )
    .join("");

  return `<div class="toolbar"><label class="sr-only" for="lead-search">Search leads</label><input id="lead-search" class="toolbar-search" type="search" placeholder="Search businesses, markets, or categories" oninput="filterCurrentPage(this.value)"><span class="status">${model.leads.length} lead${model.leads.length === 1 ? "" : "s"}</span></div>
  <section class="surface table-wrap"><table class="data-table" data-leads-table><thead><tr><th>Business</th><th>Score</th><th>Stage</th><th>Value</th><th>Next action</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="mobile-card-list">${cards}</div></section>
  <div class="safe-note"><span class="safe-mark" aria-hidden="true">✓</span><span>Each lead opens a focused workspace. <strong>Approval and Zoho sending remain separate actions.</strong></span></div>`;
}

function renderPipeline(model: DashboardViewModel): string {
  return `<div class="pipeline-board" aria-label="Lead pipeline board">${dashboardStageOrder
    .map((stage) => {
      const stageLeads = model.stageGroups[stage];
      const cards = stageLeads.length
        ? stageLeads
            .map(
              (lead) => `<a class="lead-tile" data-searchable href="/leads/${encodeURIComponent(lead.id)}"><strong>${escapeHtml(lead.businessName)}</strong><span>Score ${lead.score?.total ?? "—"} · ${escapeHtml(nextStep(lead))}</span></a>`,
            )
            .join("")
        : `<div class="empty-state"><p>No leads in this stage.</p></div>`;
      return `<section class="pipeline-column"><header class="pipeline-column-head"><strong>${escapeHtml(stageLabel(stage))}</strong><span>${stageLeads.length}</span></header>${cards}</section>`;
    })
    .join("")}</div>
    <div class="safe-note"><span class="safe-mark" aria-hidden="true">✓</span><span>Stages are read from the server. Human approval remains required, and changes continue through the guarded workflow instead of client-side drag and drop.</span></div>`;
}

function renderPreviewCard(model: DashboardViewModel, lead: Lead): string {
  const previewReady = Boolean(lead.demoPath || lead.salesAssets);
  const href = previewHref(lead);
  const controls = [
    model.capabilities.generatePreview
      ? `<button class="button-secondary" type="button" onclick="generateLead('${escapeHtml(lead.id)}')">Generate</button>`
      : "",
    model.capabilities.uploadPreview
      ? `<label class="button-secondary">Upload ZIP<input class="sr-only" type="file" accept=".zip,application/zip" onchange="uploadPreview('${escapeHtml(lead.id)}',this)"></label>`
      : "",
    model.capabilities.restoreGeneratedPreview && previewReady
      ? `<button class="button-secondary" type="button" onclick="restoreGeneratedPreview('${escapeHtml(lead.id)}')">Restore generated</button>`
      : "",
    href
      ? `<a class="button" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open private preview</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<article class="content-card" data-searchable><div class="preview-thumb"><strong>${escapeHtml(lead.businessName)}</strong><span>${previewReady ? "Private concept preview" : "No active preview"}</span></div><div class="content-card-meta"><div><h2>${previewReady ? "Preview ready" : "Ready for design"}</h2><p>${escapeHtml(stageLabel(lead.stage))}</p></div><span class="status ${previewReady ? "status-ready" : "status-muted"}">${previewReady ? "Private" : "Pending"}</span></div>${controls ? `<div class="card-actions" style="margin-top:14px">${controls}</div>` : ""}</article>`;
}

function renderPreviews(model: DashboardViewModel): string {
  const candidates = model.leads.filter((lead) =>
    ["qualified", "demo_ready", "approved", "contacted", "responded", "proposal", "won"].includes(lead.stage),
  );
  const cards = candidates.length
    ? `<div class="card-grid">${candidates.map((lead) => renderPreviewCard(model, lead)).join("")}</div>`
    : `<section class="surface"><div class="empty-state"><strong>No private previews yet</strong><p>Qualified leads will appear here when they are ready for design work.</p></div></section>`;
  const generationNote = model.capabilities.generatePreview
    ? "Preview generation is available on this server."
    : "Preview generation is not available in this GitHub checkout yet.";

  return `${cards}<div class="safe-note"><span class="safe-mark" aria-hidden="true">◇</span><span>${generationNote} Private previews remain isolated and are not shared until a person approves them.</span></div>`;
}

function renderAgents(): string {
  const agents = [
    ["Manager", "Strategy and oversight", "Coordinates stage work and surfaces owner decisions.", true],
    ["Scout", "Lead discovery", "Finds local businesses and records source evidence.", true],
    ["Auditor", "Website evidence", "Runs deterministic checks and keeps facts separate from interpretation.", true],
    ["Designer", "Website concepts", "Prepares validated private concepts when the provider is configured.", Boolean(config.groqApiKey || config.geminiApiKey)],
    ["Sales", "Drafts and follow-up", "Creates outreach drafts but cannot send without human approval.", true],
    ["Accounting", "Financial support", "Reads permitted Zoho Books data without creating transactions.", Boolean(config.zohoBooksMcpUrl)],
    ["Legal", "Compliance support", "Supports review without signing or making binding decisions.", Boolean(config.agentEmails.legal)],
  ] as const;
  return `<div class="card-grid" aria-label="AI team">${agents
    .map(
      ([name, role, detail, ready]) => `<article class="content-card"><div class="agent-icon" aria-hidden="true">${name.slice(0, 1)}</div><div class="content-card-meta"><div><h2>${name}</h2><p>${role}</p></div><span class="status ${ready ? "status-ready" : "status-muted"}">${ready ? "Ready" : "Not configured"}</span></div><p>${detail}</p></article>`,
    )
    .join("")}</div>`;
}

function renderInbox(): string {
  return `<section class="surface"><div class="empty-state"><strong>Inbox is ready for real work</strong><p>No invented messages are shown. Persistent agent handoffs, approvals, and blockers will appear here when that workflow exists.</p></div></section><div class="safe-note"><span class="safe-mark">✓</span><span>Outreach approvals already live on each lead. Approval still does not send email.</span></div>`;
}

function renderAccounting(): string {
  return `<section class="surface"><div class="section-head"><h2>Read-only accounting</h2><span class="status ${config.zohoBooksMcpUrl ? "status-ready" : "status-muted"}">${config.zohoBooksMcpUrl ? "Connected" : "Not configured"}</span></div><div class="empty-state"><strong>Financial context without mutation</strong><p>Zoho Books remains read only. This command center cannot create invoices, payments, refunds, or bookkeeping entries.</p></div></section>`;
}

function renderLegal(): string {
  return `<section class="surface"><div class="section-head"><h2>Legal support</h2><span class="status status-muted">Non-binding</span></div><div class="empty-state"><strong>Human legal judgment stays in control</strong><p>This workspace may organize review material, but it does not sign or accept agreements and cannot make binding legal decisions.</p></div></section>`;
}

function renderIntegrations(): string {
  return `<section aria-label="Integration health" class="permission-list">${integrationState()
    .map(
      (item) => `<div class="permission-row"><div><strong>${item.name}</strong><span>${escapeHtml(item.detail)}</span></div><span class="status ${item.ready ? "status-ready" : "status-muted"}">${item.permission}</span></div>`,
    )
    .join("")}</section><div class="safe-note"><span class="safe-mark">✓</span><span><strong>Human approval required</strong> for customer outreach. Connection labels report configuration state, not guaranteed uptime.</span></div>`;
}

function renderSettings(): string {
  const aiProvider = config.salesAiProvider === "groq" ? "Groq preferred" : "Gemini preferred";
  return `<section class="surface"><div class="section-head"><h2>Configuration status</h2><small>Non-secret values only</small></div><div class="workspace-section"><div class="info-grid"><div class="info-item"><span>Sales AI route</span><strong>${escapeHtml(aiProvider)}</strong></div><div class="info-item"><span>Default markets</span><strong>${config.defaultMarkets.length} configured</strong></div><div class="info-item"><span>Default categories</span><strong>${config.defaultCategories.length} configured</strong></div><div class="info-item"><span>Discovery endpoints</span><strong>${config.overpassUrls.length} configured</strong></div></div></div></section><div class="safe-note"><span class="safe-mark">✓</span><span>Secret values are never displayed. Credentials remain in the server environment.</span></div>`;
}

const workspaceTransitions: Record<LeadStage, LeadStage[]> = {
  new: ["audited", "lost"],
  audited: ["qualified", "lost"],
  qualified: ["demo_ready", "lost"],
  demo_ready: ["lost"],
  approved: ["lost"],
  contacted: ["responded", "lost"],
  responded: ["proposal", "lost"],
  proposal: ["won", "lost"],
  won: [],
  lost: [],
};

function safeWebHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "http://local.invalid");
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (url.hostname === "local.invalid" && !value.startsWith("/")) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function previewHref(lead: Lead): string | undefined {
  if (!lead.demoPath) return undefined;
  const directHref = safeWebHref(lead.demoPath);
  if (directHref && /^https?:\/\//i.test(lead.demoPath)) return directHref;
  return `/api/leads/${encodeURIComponent(lead.id)}/preview`;
}

function auditEvidence(lead: Lead): string[] {
  if (!lead.audit) return ["Audit has not been run for this lead."];
  const audit = lead.audit;
  return [
    `Reachable: ${audit.reachable ? "Yes" : "No"}`,
    `HTTPS: ${audit.https ? "Yes" : "No"}`,
    audit.statusCode ? `HTTP status: ${audit.statusCode}` : "HTTP status: Not recorded",
    audit.responseMs ? `Initial response: ${audit.responseMs} ms` : "Initial response: Not recorded",
    `Mobile viewport: ${audit.hasViewportMeta ? "Present" : "Not detected"}`,
    `Primary CTA: ${audit.hasPrimaryCta ? "Detected" : "Not detected"}`,
    `Contact form: ${audit.hasContactForm ? "Detected" : "Not detected"}`,
    `Structured data: ${audit.hasStructuredData ? "Detected" : "Not detected"}`,
    ...audit.notes,
  ];
}

function renderWorkspaceActions(lead: Lead): string {
  if (lead.stage === "demo_ready") {
    const ready = Boolean(lead.salesAssets?.outreachDraft && lead.salesAssets.generatedAt);
    return `<button class="button" type="button" data-lead-id="${escapeHtml(lead.id)}" onclick="approve(this.dataset.leadId)"${ready ? "" : " disabled"}>Approve outreach</button>${ready ? "" : `<span class="status status-muted">Generate and review the draft first</span>`}`;
  }
  if (lead.stage === "approved") {
    const currentDraftApproved = Boolean(
      lead.approvedForOutreach &&
      lead.salesAssets?.generatedAt &&
      lead.approvedOutreachGeneratedAt === lead.salesAssets.generatedAt,
    );
    const ready = Boolean(currentDraftApproved && lead.contactEmail);
    const reason = !lead.contactEmail
      ? "Add a contact email before sending"
      : !currentDraftApproved
        ? "Review and approve the current draft before sending"
        : "Send only the approved draft";
    return `<button class="button" type="button" data-lead-id="${escapeHtml(lead.id)}" onclick="sendZoho(this.dataset.leadId)"${ready ? "" : " disabled"}>Send through Zoho</button><span class="status ${ready ? "status-ready" : "status-muted"}">${reason}</span>`;
  }
  return `<span class="status status-muted">${escapeHtml(nextStep(lead))}</span>`;
}

function renderWorkspacePreview(model: DashboardViewModel, lead: Lead): string {
  const href = previewHref(lead);
  const controls = [
    model.capabilities.generatePreview
      ? `<button class="button-secondary" type="button" data-lead-id="${escapeHtml(lead.id)}" onclick="generateLead(this.dataset.leadId)">Generate preview</button>`
      : "",
    model.capabilities.uploadPreview
      ? `<label class="button-secondary">Upload ZIP<input class="sr-only" type="file" accept=".zip,application/zip" data-lead-id="${escapeHtml(lead.id)}" onchange="uploadPreview(this.dataset.leadId,this)"></label>`
      : "",
    model.capabilities.restoreGeneratedPreview && Boolean(lead.demoPath || lead.salesAssets)
      ? `<button class="button-secondary" type="button" data-lead-id="${escapeHtml(lead.id)}" onclick="restoreGeneratedPreview(this.dataset.leadId)">Restore generated</button>`
      : "",
    href
      ? `<a class="button" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open private preview</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<section class="surface workspace-section"><h2>Private website preview</h2><div class="preview-thumb"><strong>${escapeHtml(lead.salesAssets?.demoHeadline || lead.businessName)}</strong><span>${escapeHtml(lead.salesAssets?.demoSubheadline || "No generated preview is active yet.")}</span></div>${controls ? `<div class="action-bar">${controls}</div>` : `<p class="safe-note">Preview controls are unavailable on this server. Existing generated artifacts remain untouched.</p>`}</section>`;
}

function renderStageControl(lead: Lead): string {
  const options = workspaceTransitions[lead.stage]
    .map((stage) => `<option value="${stage}">${escapeHtml(stageLabel(stage))}</option>`)
    .join("");
  if (!options) return `<span class="status status-muted">No manual transition available</span>`;
  return `<label class="inline-form"><span class="sr-only">Move lead to a valid next stage</span><select data-lead-id="${escapeHtml(lead.id)}" onchange="stage(this.dataset.leadId,this.value)"><option value="">Move to…</option>${options}</select></label>`;
}

export function renderLeadWorkspace(model: DashboardViewModel): string {
  const lead = model.selectedLead;
  if (!lead) {
    return `<section class="surface"><div class="empty-state"><strong>Lead not found</strong><p>This lead may have been removed or the link may be incomplete.</p><p><a class="button-secondary" href="/leads">Return to leads</a></p></div></section>`;
  }

  const websiteHref = safeWebHref(lead.website);
  const auditItems = auditEvidence(lead)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const scoreItems = lead.score?.items.length
    ? lead.score.items
        .map(
          (item) => `<li><strong>${escapeHtml(item.label)} · ${item.points} pts</strong><br>${escapeHtml(item.evidence)}</li>`,
        )
        .join("")
    : `<li>No score evidence has been recorded.</li>`;
  const notes = lead.notes.length
    ? lead.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")
    : `<li>No notes have been recorded.</li>`;
  const currentStageIndex = dashboardStageOrder.indexOf(lead.stage);
  const stageTrack = dashboardStageOrder
    .filter((stage) => stage !== "lost")
    .map((stage) => {
      const stageIndex = dashboardStageOrder.indexOf(stage);
      const state = stage === lead.stage ? "current" : lead.stage !== "lost" && stageIndex < currentStageIndex ? "done" : "";
      return `<div class="stage-node ${state}"><div class="stage-dot"></div><span>${escapeHtml(stageLabel(stage))}</span></div>`;
    })
    .join("");

  return `<div class="workspace-stack">
    <section class="surface workspace-section"><div class="content-card-meta"><div><h2 style="margin-bottom:5px">${escapeHtml(lead.businessName)}</h2><span class="status ${stageTone(lead.stage)}">${escapeHtml(stageLabel(lead.stage))}</span></div><a class="text-button" href="/leads">Back to leads</a></div><div class="action-bar" style="margin-top:16px">${renderWorkspaceActions(lead)}${renderStageControl(lead)}</div></section>
    <div class="workspace-grid">
      <div class="workspace-stack">
        <section class="surface workspace-section"><h2>Business information</h2><div class="info-grid"><div class="info-item"><span>Category</span><strong>${escapeHtml(lead.category || "Not recorded")}</strong></div><div class="info-item"><span>Market</span><strong>${escapeHtml(lead.market || "Not recorded")}</strong></div><div class="info-item"><span>Address</span><strong>${escapeHtml(lead.address || "Not recorded")}</strong></div><div class="info-item"><span>Phone</span><strong>${escapeHtml(lead.phone || "Not recorded")}</strong></div><div class="info-item"><span>Email</span><strong>${escapeHtml(lead.contactEmail || "Not recorded")}</strong></div><div class="info-item"><span>Website</span><strong>${websiteHref ? `<a class="text-button" href="${escapeHtml(websiteHref)}" target="_blank" rel="noreferrer">Open website</a>` : "Not recorded"}</strong></div></div></section>
        <section class="surface workspace-section"><h2>Recorded audit evidence</h2><ul class="evidence-list">${auditItems}</ul></section>
        ${renderWorkspacePreview(model, lead)}
        <section class="surface workspace-section"><h2>Pipeline activity</h2><div class="stage-track">${stageTrack}</div>${lead.stage === "lost" ? `<p class="safe-note">This lead is closed as lost. No further stage action is available.</p>` : ""}</section>
      </div>
      <aside class="workspace-stack">
        <section class="surface workspace-section"><h2>Opportunity score</h2><div class="score-block"><div class="score-ring" style="--score:${Math.max(0, Math.min(100, lead.score?.total ?? 0))}"><strong>${lead.score?.total ?? 0}</strong></div><ul class="evidence-list">${scoreItems}</ul></div></section>
        <section class="surface workspace-section"><h2>Outreach draft</h2><label class="field">Subject<input readonly value="${escapeHtml(`Website concept for ${lead.businessName} — TechTactics`)}"></label><label class="field">Message<textarea readonly>${escapeHtml(lead.salesAssets?.outreachDraft || "Generate sales assets before preparing outreach.")}</textarea></label><div class="safe-note"><span class="safe-mark">✓</span><span>Approving this draft does not send it. Zoho sending is a separate, confirmed action.</span></div></section>
        <section class="surface workspace-section"><h2>Notes</h2><ul class="evidence-list">${notes}</ul></section>
      </aside>
    </div>
  </div>`;
}

export function renderDashboardPage(model: DashboardViewModel): string {
  switch (model.page.id) {
    case "overview": return renderOverview(model);
    case "leads": return renderLeadTable(model);
    case "lead": return renderLeadWorkspace(model);
    case "pipeline": return renderPipeline(model);
    case "previews": return renderPreviews(model);
    case "agents": return renderAgents();
    case "inbox": return renderInbox();
    case "accounting": return renderAccounting();
    case "legal": return renderLegal();
    case "integrations": return renderIntegrations();
    case "settings": return renderSettings();
  }
}
