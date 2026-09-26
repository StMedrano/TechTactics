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
    total: 84,
    calculatedAt: "2026-09-25T00:00:00.000Z",
    items: [
      { key: "cta", label: "Weak call to action", points: 15, evidence: "Test" },
      { key: "mobile", label: "Not mobile optimized", points: 20, evidence: "Test" }
    ]
  },
  audit: {
    checkedAt: "2026-09-25T00:00:00.000Z",
    reachable: true,
    https: true,
    hasMetaDescription: false,
    hasViewportMeta: false,
    hasContactForm: false,
    hasPhoneLink: true,
    hasEmailLink: false,
    hasPrimaryCta: false,
    hasStructuredData: false,
    hasAnalyticsMarker: false,
    responseMs: 3200,
    notes: ["Test audit"]
  },
  notes: []
};

describe("reference Web Growth Command Center UI", () => {
  it("renders the dark two-column operations cockpit from the approved reference", () => {
    const html = renderDashboard([lead]);

    for (const klass of [
      "cockpit",
      "sidebar",
      "command-header",
      "integration-strip",
      "hero-command",
      "metric-grid",
      "pipeline-overview",
      "recent-leads",
      "detail-panel",
      "lead-tabs",
      "audit-demo-grid",
      "outreach-grid"
    ]) {
      expect(html).toMatch(new RegExp(`class="[^"]*\\b${klass}\\b[^"]*"`));
    }

    for (const label of ["Overview", "Pipeline", "Leads", "Agents", "Inbox", "Accounting", "Legal", "Integrations", "Settings"]) {
      expect(html).toContain(label);
    }
    for (const stage of ["Find", "Audit", "Demo", "Approve", "Contact", "Close"]) {
      expect(html).toContain(stage);
    }

    expect(html).toContain("Grow Local Businesses Online");
    expect(html).toContain("Recent Leads");
    expect(html).toContain("Business Information");
    expect(html).toContain("Opportunity Score");
    expect(html).toContain("Website Audit Summary");
    expect(html).toContain("Website Demo");
    expect(html).toContain("Outreach Draft");
  });

  it("uses the real TechTactics logo and existing smart-home hero asset", () => {
    const html = applyBrandLogo(renderDashboard([lead]));

    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain("hero-smarthome-poster.png");
  });

  it("reflects actual integrations rather than obsolete OpenAI/Google Places labels", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain("Zoho Mail");
    expect(html).toContain("Zoho Books");
    expect(html).toContain("Gemini");
    expect(html).toContain("OpenStreetMap");
    expect(html).not.toContain(">OpenAI<");
    expect(html).not.toContain(">Google Places<");
  });

  it("renders desktop lead table, mobile lead cards, and stacked mobile inspector", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain('class="lead-table"');
    expect(html).toContain('class="mobile-leads"');
    expect(html).toContain('class="lead-card"');
    expect(html).toContain("@media(max-width:860px)");
    expect(html).toContain(".lead-table{display:none}");
    expect(html).toContain(".mobile-leads{display:grid");
    expect(html).toContain(".workspace-shell{grid-template-columns:1fr}");
    expect(html).toContain(".detail-panel{position:static");
  });

  it("keeps real approval and Zoho controls inside the reference visual system", () => {
    const html = renderDashboard([lead]);

    expect(html).toContain("Send Through Zoho");
    expect(html).toContain("Move Stage");
    expect(html).toContain("Human approval");
    expect(html).toContain("min-height:44px");
  });
});
