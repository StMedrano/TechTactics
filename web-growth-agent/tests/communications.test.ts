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
  const generatedAt = "2026-01-01T00:00:00.000Z";
  return {
    id: "mail-lead",
    source: "fixture",
    businessName: "Mail Test Business",
    contactEmail: "owner@example.com",
    discoveredAt: generatedAt,
    updatedAt: generatedAt,
    stage,
    approvedForOutreach: approved,
    approvedOutreachGeneratedAt: approved ? generatedAt : undefined,
    salesAssets: {
      generatedAt,
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

  it("refuses a regenerated draft that does not match the approved version", async () => {
    const changed = lead("approved", true);
    changed.salesAssets = { ...changed.salesAssets!, generatedAt: "2026-02-01T00:00:00.000Z" };
    const store = await storeWith(changed);
    const sender = vi.fn().mockResolvedValue({ summary: "sent" });
    await expect(sendApprovedOutreach("mail-lead", { store, sender })).rejects.toThrow(/version.*approved/i);
    expect(sender).not.toHaveBeenCalled();
  });

  it("persists a reservation before sending and records success", async () => {
    const store = await storeWith(lead("approved", true));
    const sender = vi.fn(async () => {
      const duringSend = await store.get("mail-lead");
      expect(duringSend?.outreachSend?.status).toBe("pending");
      return { summary: "sent", providerCallId: "provider-1" };
    });
    const updated = await sendApprovedOutreach("mail-lead", { store, sender });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(updated.stage).toBe("contacted");
    expect(updated.outreachSend?.status).toBe("sent");
    expect(updated.communications).toHaveLength(1);
    expect(updated.communications?.[0].providerCallId).toBe("provider-1");
  });

  it("blocks retry when a previous send reservation exists", async () => {
    const reserved = lead("approved", true);
    reserved.outreachSend = {
      status: "pending",
      attemptId: "existing-attempt",
      startedAt: "2026-01-01T00:00:00.000Z",
      to: "owner@example.com",
      subject: "Existing attempt"
    };
    const store = await storeWith(reserved);
    const sender = vi.fn().mockResolvedValue({ summary: "sent" });
    await expect(sendApprovedOutreach("mail-lead", { store, sender })).rejects.toThrow(/reconcile/i);
    expect(sender).not.toHaveBeenCalled();
  });

  it("marks a failed or ambiguous provider attempt for human review", async () => {
    const store = await storeWith(lead("approved", true));
    const sender = vi.fn().mockRejectedValue(new Error("provider timeout"));
    await expect(sendApprovedOutreach("mail-lead", { store, sender })).rejects.toThrow(/provider timeout/i);
    const stored = await store.get("mail-lead");
    expect(stored?.outreachSend?.status).toBe("needs_review");
  });
});
