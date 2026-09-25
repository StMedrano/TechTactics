import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { sendApprovedOutreach } from "../src/communications.js";
import { LeadStore } from "../src/store.js";
import type { Lead } from "../src/types.js";

async function storeWith(lead: Lead): Promise<LeadStore> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wga-mail-"));
  const store = new LeadStore(path.join(directory, "leads.json"));
  await store.upsert(lead);
  return store;
}

function lead(stage: Lead["stage"], approved: boolean): Lead {
  return {
    id: "mail-lead",
    source: "fixture",
    businessName: "Mail Test Business",
    contactEmail: "owner@example.com",
    discoveredAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stage,
    approvedForOutreach: approved,
    salesAssets: {
      generatedAt: "2026-01-01T00:00:00.000Z",
      businessSummary: "Summary",
      outreachDraft: "Reviewed outreach draft.",
      proposalMarkdown: "# Proposal",
      demoHeadline: "Demo",
      demoSubheadline: "Subheadline",
      demoServices: ["One", "Two", "Three"],
      recommendedPackage: "Launch"
    },
    notes: []
  };
}

describe("Zoho customer outreach gate", () => {
  it("refuses to call the sender before approval", async () => {
    const store = await storeWith(lead("demo_ready", false));
    const sender = vi.fn().mockResolvedValue({ summary: "sent", providerCallId: "x" });
    await expect(sendApprovedOutreach("mail-lead", { store, sender })).rejects.toThrow(/approval/i);
    expect(sender).not.toHaveBeenCalled();
  });

  it("sends exactly once after approval and records the contact", async () => {
    const store = await storeWith(lead("approved", true));
    const sender = vi.fn().mockResolvedValue({ summary: "sent", providerCallId: "provider-1" });
    const updated = await sendApprovedOutreach("mail-lead", { store, sender });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(updated.stage).toBe("contacted");
    expect(updated.communications).toHaveLength(1);
    expect(updated.communications?.[0].providerCallId).toBe("provider-1");
  });

  it("blocks a duplicate initial outreach record", async () => {
    const duplicate = lead("approved", true);
    duplicate.communications = [{
      at: "2026-01-01T00:00:00.000Z",
      channel: "zoho_email",
      kind: "customer_outreach",
      direction: "outbound",
      to: "owner@example.com",
      subject: "Already sent"
    }];
    const store = await storeWith(duplicate);
    const sender = vi.fn().mockResolvedValue({ summary: "sent" });
    await expect(sendApprovedOutreach("mail-lead", { store, sender })).rejects.toThrow(/duplicate/i);
    expect(sender).not.toHaveBeenCalled();
  });
});
