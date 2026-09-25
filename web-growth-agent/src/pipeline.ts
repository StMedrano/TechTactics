import { auditWebsite } from "./audit.js";
import { generateSalesAssets } from "./ai.js";
import { calculateOpportunityScore, shouldQualify } from "./score.js";
import { writeLeadArtifacts } from "./site.js";
import { LeadStore } from "./store.js";
import type { Lead, LeadStage } from "./types.js";
import { nowIso } from "./utils.js";

const transitions: Record<LeadStage, LeadStage[]> = {
  new: ["audited", "lost"],
  audited: ["qualified", "lost"],
  qualified: ["demo_ready", "lost"],
  demo_ready: ["approved", "lost"],
  approved: ["contacted", "lost"],
  contacted: ["responded", "lost"],
  responded: ["proposal", "lost"],
  proposal: ["won", "lost"],
  won: [],
  lost: []
};

export async function auditLead(id: string, store = new LeadStore()): Promise<Lead> {
  const lead = await store.get(id);
  if (!lead) throw new Error(`Lead not found: ${id}`);

  const audit = lead.website ? await auditWebsite(lead.website) : undefined;
  const scored: Lead = {
    ...lead,
    audit,
    contactEmail: lead.contactEmail || audit?.contactEmail,
    stage: lead.stage === "new" ? "audited" : lead.stage,
    updatedAt: nowIso()
  };
  scored.score = calculateOpportunityScore(scored);
  return store.upsert(scored);
}

export async function auditAll(store = new LeadStore()): Promise<Lead[]> {
  const leads = await store.all();
  const results: Lead[] = [];
  for (const lead of leads) {
    if (lead.stage === "won" || lead.stage === "lost") continue;
    results.push(await auditLead(lead.id, store));
  }
  return results;
}

export async function qualifyAll(minScore = 35, store = new LeadStore()): Promise<Lead[]> {
  const leads = await store.all();
  const qualified: Lead[] = [];
  for (const lead of leads) {
    if (lead.stage !== "audited" || !shouldQualify(lead, minScore)) continue;
    const updated = await store.update(lead.id, (current) => ({ ...current, stage: "qualified" }));
    qualified.push(updated);
  }
  return qualified;
}

export async function generateForLead(id: string, store = new LeadStore()): Promise<Lead> {
  const lead = await store.get(id);
  if (!lead) throw new Error(`Lead not found: ${id}`);
  if (!["qualified", "demo_ready", "approved"].includes(lead.stage)) {
    throw new Error(`Lead must be qualified before generation. Current stage: ${lead.stage}`);
  }

  const assets = await generateSalesAssets(lead);
  const artifact = await writeLeadArtifacts(lead, assets);
  return store.update(id, (current) => ({
    ...current,
    salesAssets: assets,
    demoPath: artifact.demoPath,
    approvedForOutreach: false,
    approvedOutreachGeneratedAt: undefined,
    outreachSend: undefined,
    stage: "demo_ready"
  }));
}

export async function approveLead(id: string, store = new LeadStore()): Promise<Lead> {
  const lead = await store.get(id);
  if (!lead) throw new Error(`Lead not found: ${id}`);
  if (lead.stage !== "demo_ready" && lead.stage !== "approved") {
    throw new Error(`Only a demo-ready lead can be approved. Current stage: ${lead.stage}`);
  }
  if (!lead.salesAssets?.outreachDraft || !lead.salesAssets.generatedAt) {
    throw new Error("Generate and review sales assets before approving outreach.");
  }
  return store.update(id, (current) => ({
    ...current,
    approvedForOutreach: true,
    approvedOutreachGeneratedAt: current.salesAssets?.generatedAt,
    outreachSend: undefined,
    stage: "approved"
  }));
}

export async function setLeadStage(id: string, next: LeadStage, store = new LeadStore()): Promise<Lead> {
  const lead = await store.get(id);
  if (!lead) throw new Error(`Lead not found: ${id}`);
  if (lead.stage === next) return lead;
  if (!transitions[lead.stage].includes(next)) {
    throw new Error(`Invalid transition: ${lead.stage} → ${next}`);
  }
  if (next === "contacted" && !lead.approvedForOutreach) {
    throw new Error("Human approval is required before a lead can be marked contacted.");
  }
  return store.update(id, (current) => ({ ...current, stage: next }));
}
