import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { LeadStore } from "./store.js";
import type { AgentRole, Lead, OutreachSendState } from "./types.js";
import { nowIso } from "./utils.js";
import { sendZohoEmail, type ZohoSendInput, type ZohoSendResult } from "./zoho.js";

export type EmailSender = (input: ZohoSendInput) => Promise<ZohoSendResult>;

function validateEmail(value: string): string {
  const email = value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address: " + value);
  return email;
}

function compactError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/\s+/g, " ").slice(0, 500);
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
  const store = options.store || new LeadStore();
  const sender = options.sender || sendZohoEmail;
  const attemptId = randomUUID();

  const prepared = await store.update(id, (current) => {
    if (current.stage !== "approved" || !current.approvedForOutreach) {
      throw new Error("Lead must have explicit human approval before Zoho outreach can be sent.");
    }
    if (!current.salesAssets?.outreachDraft || !current.salesAssets.generatedAt) {
      throw new Error("Generate and review sales assets before sending outreach.");
    }
    if (current.approvedOutreachGeneratedAt !== current.salesAssets.generatedAt) {
      throw new Error("The current outreach draft is not the version that was approved. Review and approve it again.");
    }
    if (!current.contactEmail) {
      throw new Error("Lead does not have a contact email. Add one explicitly or audit a site with a mailto link.");
    }
    if (current.communications?.some((entry) => entry.kind === "customer_outreach")) {
      throw new Error("Customer outreach is already recorded for this lead; refusing a duplicate initial send.");
    }
    if (current.outreachSend) {
      throw new Error(
        "An outreach send attempt already exists with status " + current.outreachSend.status +
        ". Reconcile that attempt before trying another send."
      );
    }

    const subject = options.subject?.trim() || "Website concept for " + current.businessName + " — TechTactics";
    const sendState: OutreachSendState = {
      status: "pending",
      attemptId,
      startedAt: nowIso(),
      to: current.contactEmail,
      subject
    };

    return { ...current, outreachSend: sendState };
  });

  const sendState = prepared.outreachSend;
  if (!sendState || sendState.attemptId !== attemptId || !prepared.contactEmail || !prepared.salesAssets?.outreachDraft) {
    throw new Error("Failed to persist the outreach send reservation.");
  }

  let result: ZohoSendResult;
  try {
    result = await sender({
      to: prepared.contactEmail,
      subject: sendState.subject,
      body: prepared.salesAssets.outreachDraft
    });
  } catch (error) {
    await store.update(id, (current) => {
      if (current.outreachSend?.attemptId !== attemptId) return current;
      return {
        ...current,
        outreachSend: {
          ...current.outreachSend,
          status: "needs_review",
          error: compactError(error)
        }
      };
    }).catch(() => undefined);
    throw error;
  }

  return store.update(id, (current) => {
    if (current.outreachSend?.attemptId !== attemptId || current.outreachSend.status !== "pending") {
      throw new Error(
        "Zoho reported a successful send, but the durable send reservation changed. " +
        "Do not retry automatically; reconcile the Zoho Sent folder and local lead record."
      );
    }

    const sentAt = nowIso();
    return {
      ...current,
      stage: "contacted",
      outreachSend: {
        ...current.outreachSend,
        status: "sent",
        sentAt,
        providerCallId: result.providerCallId
      },
      communications: [
        ...(current.communications || []),
        {
          at: sentAt,
          channel: "zoho_email",
          kind: "customer_outreach",
          direction: "outbound",
          to: current.outreachSend.to,
          subject: current.outreachSend.subject,
          fromAgent: "sales",
          providerCallId: result.providerCallId
        }
      ],
      notes: [...current.notes, "Approved outreach sent through Zoho Mail MCP."]
    };
  });
}

export async function sendAgentEmail(
  from: AgentRole,
  to: AgentRole,
  subjectText: string,
  bodyText: string,
  sender: EmailSender = sendZohoEmail
): Promise<ZohoSendResult> {
  if (from === to) throw new Error("Agent sender and recipient must be different roles.");

  const recipient = config.agentEmails[to];
  if (!recipient) {
    throw new Error("No email address is configured for the " + to + " agent role.");
  }

  const subject = subjectText.trim();
  const body = bodyText.trim();
  if (!subject) throw new Error("Internal agent email subject is required.");
  if (!body) throw new Error("Internal agent email body is required.");

  return sender({
    to: recipient,
    subject: "[WGA:" + from + "→" + to + "] " + subject,
    body
  });
}
