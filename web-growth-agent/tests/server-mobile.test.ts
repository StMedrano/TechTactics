import { describe, expect, it } from "vitest";
import { renderDashboard } from "../src/server.js";
import type { Lead } from "../src/types.js";

const lead: Lead = {
  id: "lead-mobile",
  source: "fixture",
  businessName: "Bayou Plumbing",
  category: "Plumber",
  market: "Prairieville, LA",
  website: "https://example.com",
  contactEmail: "owner@example.com",
  discoveredAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
  stage: "approved",
  approvedForOutreach: true,
  score: {
    total: 55,
    calculatedAt: "2026-09-25T00:00:00.000Z",
    items: [{ key: "cta", label: "Weak call to action", points: 15, evidence: "Test" }]
  },
  notes: []
};

describe("mobile dashboard", () => {
  it("renders dedicated mobile lead cards instead of forcing the desktop table to scroll", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain('class="mobile-leads"');
    expect(html).toContain('class="lead-card"');
    expect(html).toContain("desktop-table");
    expect(html).toContain("@media(max-width:760px)");
    expect(html).toContain(".desktop-table{display:none}");
    expect(html).toContain(".mobile-leads{display:grid");
  });

  it("renders mobile actions as full-width controls", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain(".lead-actions button{width:100%");
    expect(html).toContain("Send via Zoho");
    expect(html).toContain("Mark contacted manually");
  });
});
