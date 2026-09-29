import { describe, expect, it } from "vitest";
import { parseDashboardPage, type DashboardPage } from "../src/dashboard-model.js";
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
  approvedOutreachGeneratedAt: "2026-09-25T00:00:00.000Z",
  salesAssets: {
    generatedAt: "2026-09-25T00:00:00.000Z",
    businessSummary: "Local plumbing company",
    outreachDraft: "A private concept is ready.",
    proposalMarkdown: "Proposal",
    demoHeadline: "Plumbing help",
    demoSubheadline: "Local and reliable",
    demoServices: ["Repairs"],
    recommendedPackage: "Pro",
  },
  score: {
    total: 84,
    calculatedAt: "2026-09-25T00:00:00.000Z",
    items: [{ key: "cta", label: "Weak call to action", points: 15, evidence: "Test" }],
  },
  notes: [],
};

function render(pathname: string): string {
  return renderDashboard([lead], parseDashboardPage(pathname) as DashboardPage);
}

describe("multipage Web Growth Command Center UI", () => {
  it("renders the approved desktop shell with real page links", () => {
    const html = render("/");

    expect(html).toContain('class="app-shell"');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="topbar"');
    expect(html).toContain('href="/leads"');
    expect(html).toContain('href="/pipeline"');
    expect(html).toContain('href="/previews"');
    expect(html).toContain("Next best work");
    expect(html).not.toContain("Recent Leads");
  });

  it("uses the TechTactics brand and approved operations palette", () => {
    const html = render("/");

    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain("--tt-black:#030407");
    expect(html).toContain("--tt-slate:#384358");
    expect(html).toContain("--tt-gold:#F7AD4E");
  });

  it("renders desktop lead rows and mobile lead cards on the Leads page", () => {
    const html = render("/leads");

    expect(html).toContain("data-leads-table");
    expect(html).toContain('class="mobile-card-list"');
    expect(html).toContain('class="lead-card"');
    expect(html).toContain("@media(max-width:860px)");
    expect(html).toContain(".data-table{display:none}");
    expect(html).toContain(".mobile-card-list{display:block}");
  });

  it("uses the four-item bottom bar and ergonomic More sheet on mobile", () => {
    const html = render("/");

    expect(html).toContain('aria-label="Primary mobile navigation"');
    expect(html.match(/data-mobile-primary/g)).toHaveLength(4);
    expect(html).toContain('data-more-toggle aria-expanded="false"');
    expect(html).toContain("transform-origin:right bottom");
    expect(html).toContain("220ms cubic-bezier(.23,1,.32,1)");
    expect(html).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("keeps guarded outreach controls in the lead workspace", () => {
    const html = render("/leads/lead-mobile");

    expect(html).toContain("Send through Zoho");
    expect(html).toContain("Send only the approved draft");
    expect(html).toContain("Move to…");
    expect(html).toContain("Approving this draft does not send it");
    expect(html).toContain("min-height:44px");
  });
});
