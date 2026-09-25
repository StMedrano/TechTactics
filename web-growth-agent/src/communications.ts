import { config } from "./config.js";
import { LeadStore } from "./store.js";
import type { AgentRole, Lead } from "./types.js";
import { nowIso } from "./utils.js";
import { sendZohoEmail, type ZohoSendInput, type ZohoSendResult } from "./zoho.js";

export type EmailSender = (input: ZohoSendInput) => Promise<ZohoSendResult>;

const outreachInFlight = new Set<string>();

function validateEmail(value: string): string {
  const email = value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address: " + value);
  return email;
}

export async function setLeadContactEmail(
  id: string,
  email: string,
  store = new LeadStore()
): Promise<Lead> {
  const validated = validateEmail(email);
  const lead = await store.get(id);
    if (!lead) throw new Error("Lead not found: " + id);
  return store.update(id, (current) => ({ ...current, contactEmail: validated }));
}

export async function sendApprovedOutreach(
  id: string,
  options: {
    subject?: string;
    store?: LeadStore;
    sender?: EmailSender;
  } = {}
): Promise<Lead> {
  if (outreachInFlight.has(id)) throw new Error("An outreach send is already in progress for this lead.");
  outreachInFlight.add(id);
  try {
    const store = options.store || new LeadStore();
    const sender = options.sender || sendZohoEmail;
    const lead = await store.get(id);
    if (!lead) throw new Error("Lead not found: " + id);
    if (lead.stage !== "approved" || !lead.approvedForOutreach) {
    throw new Error("Lead must have explicit human approval before Zoho outreach can be sent.");
  }
    if (!lead.salesAssets?.outreachDraft) {
    throw new Error("Generate and review sales assets before sending outreach.");
  }
    if (!lead.contactEmail) {
    throw new Error("Lead does not have a contact email. Add one explicitly or audit a site with a mailto link.");
  }
    if (lead.communications?.some((entry) => entry.kind === "customer_outreach")) {
    throw new Error("Customer outreach is already recorded for this lead; refusing a duplicate initial send.");
  }

    const subject = options.subject?.trim() || "Website concept for " + lead.businessName + " — TechTactics";
    const result = await sender({
      to: lead.contactEmail,
      subject,
      body: lead.salesAssets.outreachDraft
    });

    return store.update(id, (current) => ({
      ...current,
      stage: "contacted",
    communications: [
      ...(current.communications || []),
      {
        at: nowIso(),
        channel: "zoho_email",
        kind: "customer_outreach",
        direction: "outbound",
        to: lead.contactEmail as string,
        subject,
        fromAgent: "sales",
        providerCallId: result.providerCallId
      }
    ],
      notes: [...current.notes, "Approved outreach sent through Zoho Mail MCP."]
    }));
  } finally {
    outreachInFlight.delete(id);
  }
}

export async function sendAgentEmail(
  from: AgentRole,
  to: AgentRole,
  subject: string,
  body: string,
  sender: EmailSender = sendZohoEmail
): Promise<ZohoSendResult> {
  if (from === to) throw new Error("Agent sender and recipient must be different roles.");
  const recipient = config.agentEmails[to];
  if (!recipient) {
    throw new Error("No email address is configured for the " + to + " agent role.");
  }
  const taggedSubject = "[WGA:" + from + "→" + to + "] " + subject.trim();
  return sender({
    to: recipient,
    subject: taggedSubject,
    body: body.trim()
  });
}
