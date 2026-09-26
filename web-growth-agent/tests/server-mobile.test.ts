import { describe, expect, it } from "vitest";
import { applyBrandLogo } from "../src/brand.js";
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

describe("Web Growth Command Center", () => {
  it("renders the approved command-center navigation and operating workflow", () => {
    const html = renderDashboard([lead]);

    for (const label of ["Overview", "Pipeline", "Leads", "Agents", "Inbox", "Accounting", "Legal", "Integrations"]) {
      expect(html).toContain(`>${label}<`);
    }
    for (const stage of ["Find", "Audit", "Demo", "Approve", "Contact", "Close"]) {
      expect(html).toContain(`>${stage}<`);
    }
    expect(html).toContain("Web Growth Command Center");
    expect(html).toContain("Agent Operations");
    expect(html).toContain("Integration Health");
  });

  it("uses the TechTactics rebrand logo with a local-style fallback mark", () => {
    const html = applyBrandLogo(renderDashboard([lead]));

    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain('class="brand-mark brand-fallback"');
  });

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
