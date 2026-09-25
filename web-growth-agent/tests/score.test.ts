import { describe, expect, it } from "vitest";
import { calculateOpportunityScore } from "../src/score.js";
import type { Lead } from "../src/types.js";

function baseLead(): Lead {
  return {
    id: "test",
    source: "fixture",
    businessName: "Test Business",
    discoveredAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stage: "audited",
    approvedForOutreach: false,
    notes: []
  };
}

describe("calculateOpportunityScore", () => {
  it("scores an explicitly verified no-website opportunity without inventing extra defects", () => {
    const lead = { ...baseLead(), websiteDiscoveryStatus: "verified_absent" as const };
    const score = calculateOpportunityScore(lead, 2026);
    expect(score.total).toBe(40);
    expect(score.items).toHaveLength(1);
    expect(score.items[0].key).toBe("no_website");
  });

  it("treats a website missing from discovery as evidence, not proof", () => {
    const lead = { ...baseLead(), websiteDiscoveryStatus: "not_found" as const };
    const score = calculateOpportunityScore(lead, 2026);
    expect(score.total).toBe(35);
    expect(score.items[0].key).toBe("website_not_found");
    expect(score.items[0].evidence).toMatch(/Human verification/i);
  });

  it("does not award no-website points when discovery status is unknown", () => {
    const score = calculateOpportunityScore(baseLead(), 2026);
    expect(score.total).toBe(0);
    expect(score.items).toHaveLength(0);
  });

  it("records only reachability evidence when the page could not be inspected", () => {
    const lead: Lead = {
      ...baseLead(),
      website: "http://example.test",
      audit: {
        checkedAt: "2026-01-01T00:00:00.000Z",
        reachable: false,
        responseMs: 4000,
        https: false,
        hasMetaDescription: false,
        hasViewportMeta: false,
        hasContactForm: false,
        hasPhoneLink: false,
        hasEmailLink: false,
        hasPrimaryCta: false,
        hasStructuredData: false,
        hasAnalyticsMarker: false,
        oldCopyrightYear: 2020,
        notes: ["synthetic network failure"]
      }
    };
    const score = calculateOpportunityScore(lead, 2026);
    expect(score.total).toBe(30);
    expect(score.items.map((item) => item.key)).toEqual(["unreachable"]);
  });

  it("scores inspected page evidence and caps at 100", () => {
    const lead: Lead = {
      ...baseLead(),
      website: "http://example.test",
      audit: {
        checkedAt: "2026-01-01T00:00:00.000Z",
        reachable: true,
        responseMs: 4000,
        https: false,
        hasMetaDescription: false,
        hasViewportMeta: false,
        hasContactForm: false,
        hasPhoneLink: false,
        hasEmailLink: false,
        hasPrimaryCta: false,
        hasStructuredData: false,
        hasAnalyticsMarker: false,
        oldCopyrightYear: 2020,
        notes: ["synthetic inspected HTML"]
      }
    };
    const score = calculateOpportunityScore(lead, 2026);
    expect(score.total).toBe(90);
    expect(score.items.map((item) => item.key)).toContain("mobile");
    expect(score.items.map((item) => item.key)).toContain("old_copyright");
  });
});
