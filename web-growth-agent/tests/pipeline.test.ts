import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { approveLead, setLeadStage } from "../src/pipeline.js";
import { LeadStore } from "../src/store.js";
import type { Lead } from "../src/types.js";

async function storeWith(lead: Lead): Promise<LeadStore> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wga-"));
  const store = new LeadStore(path.join(directory, "leads.json"));
  await store.upsert(lead);
  return store;
}

function demoLead(approved = false): Lead {
  return {
    id: "lead1",
    source: "fixture",
    businessName: "Demo Business",
    discoveredAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stage: approved ? "approved" : "demo_ready",
    approvedForOutreach: approved,
    notes: []
  };
}

describe("human approval gate", () => {
  it("approves a demo-ready lead explicitly", async () => {
    const store = await storeWith(demoLead());
    const lead = await approveLead("lead1", store);
    expect(lead.stage).toBe("approved");
    expect(lead.approvedForOutreach).toBe(true);
  });

  it("does not allow contacted without approval", async () => {
    const lead = demoLead();
    lead.stage = "approved";
    lead.approvedForOutreach = false;
    const store = await storeWith(lead);
    await expect(setLeadStage("lead1", "contacted", store)).rejects.toThrow(/approval/i);
  });

  it("allows contacted after approval", async () => {
    const store = await storeWith(demoLead(true));
    const lead = await setLeadStage("lead1", "contacted", store);
    expect(lead.stage).toBe("contacted");
  });
});
