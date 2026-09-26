import { LeadStore } from "./store.js";
import type { Lead } from "./types.js";
import { nowIso } from "./utils.js";

export async function seedFixtures(store = new LeadStore()): Promise<Lead[]> {
  const now = nowIso();
  const fixtures: Lead[] = [
    {
      id: "fixture_no_site",
      source: "fixture",
      sourceId: "fixture-no-site",
      businessName: "Bayou Home Services",
      category: "Home services",
      market: "Demo Market",
      address: "100 Demo Ave",
      phone: "(555) 010-1000",
      discoveredAt: now,
      updatedAt: now,
      stage: "new",
      approvedForOutreach: false,
      notes: ["Synthetic fixture for local evaluation; not a real business."]
    },
    {
      id: "fixture_old_site",
      source: "fixture",
      sourceId: "fixture-old-site",
      businessName: "Pelican Repair Co.",
      category: "Auto repair",
      market: "Demo Market",
      address: "200 Demo Ave",
      phone: "(555) 010-2000",
      website: "https://example.com",
      discoveredAt: now,
      updatedAt: now,
      stage: "new",
      approvedForOutreach: false,
      notes: ["Synthetic fixture for local evaluation; website URL intentionally uses example.com."]
    },
    {
      id: "fixture_manual",
      source: "fixture",
      sourceId: "fixture-manual",
      businessName: "Cypress Accounting",
      category: "Accountant",
      market: "Demo Market",
      address: "300 Demo Ave",
      discoveredAt: now,
      updatedAt: now,
      stage: "new",
      approvedForOutreach: false,
      notes: ["Synthetic fixture for local evaluation; not a real business."]
    }
  ];
  for (const fixture of fixtures) await store.upsert(fixture);
  return fixtures;
}

export async function removeFixtureLeads(store = new LeadStore()): Promise<number> {
  const all = await store.all();
  const realLeads = all.filter((lead) => lead.source !== "fixture");
  const removed = all.length - realLeads.length;
  if (removed > 0) await store.replaceAll(realLeads);
  return removed;
}
