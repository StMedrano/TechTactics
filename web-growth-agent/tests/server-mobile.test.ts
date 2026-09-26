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

describe("approved Web Growth Command Center UI", () => {
  it("renders the approved high-fidelity dashboard shell and workflow", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain('class="app"');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="top-actions"');
    expect(html).toContain('class="workflow"');
    expect(html).toContain('class="metrics"');
    expect(html).toContain('class="grid-top"');
    expect(html).toContain('class="pipeline-rail"');
    expect(html).toContain('class="mobile-bottom-nav"');

    for (const label of ["Overview", "Pipeline", "Leads", "Agents", "Inbox", "Accounting", "Legal", "Integrations"]) {
      expect(html).toContain(label);
    }
    for (const stage of ["Find", "Audit", "Demo", "Approve", "Contact", "Close"]) {
      expect(html).toContain(`>${stage}<`);
    }
    expect(html).toContain("Web Growth Command Center");
    expect(html).toContain("Agent operations");
    expect(html).toContain("Integration health");
  });

  it("uses the TechTactics rebrand logo with a fallback mark", () => {
    const html = applyBrandLogo(renderDashboard([lead]));

    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain('class="brand-mark brand-fallback"');
  });

  it("renders the approved desktop lead table and dedicated mobile cards", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain('class="lead-table"');
    expect(html).toContain('class="mobile-leads"');
    expect(html).toContain('class="lead-card"');
    expect(html).toContain('class="lead-card-actions"');
    expect(html).toContain("@media(max-width:760px)");
    expect(html).toContain(".lead-table{display:none}");
    expect(html).toContain(".mobile-leads{display:grid");
    expect(html).toContain(".mobile-bottom-nav{position:fixed;display:flex");
  });

  it("keeps production outreach controls in the approved visual system", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain("Send via Zoho");
    expect(html).toContain("Mark contacted manually");
    expect(html).toContain("Nothing is sent automatically");
    expect(html).toContain("min-height:44px");
  });
});
