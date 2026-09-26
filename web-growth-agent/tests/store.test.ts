import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { removeFixtureLeads } from "../src/seed.js";
import { LeadStore } from "../src/store.js";
import type { Lead } from "../src/types.js";

function lead(id: string, source: Lead["source"] = "fixture"): Lead {
  return {
    id,
    source,
    businessName: "Business " + id,
    discoveredAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stage: "new",
    approvedForOutreach: false,
    notes: []
  };
}

describe("LeadStore write serialization", () => {
  it("preserves concurrent upserts across store instances sharing one file", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "wga-store-"));
    const file = path.join(directory, "leads.json");
    const a = new LeadStore(file);
    const b = new LeadStore(file);

    await Promise.all(
      Array.from({ length: 20 }, (_, index) => (index % 2 ? a : b).upsert(lead("lead-" + index)))
    );

    const all = await a.all();
    expect(all).toHaveLength(20);
    expect(new Set(all.map((item) => item.id)).size).toBe(20);
  });

  it("purges only synthetic fixture leads and preserves real leads", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "wga-purge-fixtures-"));
    const store = new LeadStore(path.join(directory, "leads.json"));
    await store.upsert(lead("fixture_one"));
    await store.upsert(lead("fixture_two"));
    await store.upsert(lead("real_one", "osm_overpass"));

    const removed = await removeFixtureLeads(store);
    const remaining = await store.all();

    expect(removed).toBe(2);
    expect(remaining.map((item) => item.id)).toEqual(["real_one"]);
  });
});
