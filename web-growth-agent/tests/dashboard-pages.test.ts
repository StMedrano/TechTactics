import { describe, expect, it } from "vitest";
import {
  buildDashboardViewModel,
  parseDashboardPage,
  type DashboardCapabilities,
  type DashboardPage,
} from "../src/dashboard-model.js";
import { renderDashboardPage } from "../src/dashboard-pages.js";
import type { Lead, LeadStage } from "../src/types.js";

function lead(id: string, stage: LeadStage, overrides: Partial<Lead> = {}): Lead {
  return {
    id,
    source: "fixture",
    businessName: `${id} & Sons`,
    category: "Electrician",
    market: "Prairieville, LA",
    discoveredAt: "2026-09-01T00:00:00.000Z",
    updatedAt: `2026-09-${String(id.length + 10).padStart(2, "0")}T00:00:00.000Z`,
    stage,
    approvedForOutreach: stage === "approved",
    notes: [],
    score: {
      total: 35,
      calculatedAt: "2026-09-20T00:00:00.000Z",
      items: [],
    },
    ...overrides,
  };
}

const leads = [
  lead("demo", "demo_ready", { demoPath: "/private/demo/index.html" }),
  lead("qualified", "qualified"),
  lead("audited-one", "audited"),
  lead("audited-two", "audited"),
  lead("new", "new"),
];

function render(
  pathname: string,
  fixtures: Lead[] = leads,
  capabilities: Partial<DashboardCapabilities> = {},
): string {
  const page = parseDashboardPage(pathname) as DashboardPage;
  return renderDashboardPage(buildDashboardViewModel(fixtures, page, capabilities));
}

describe("focused dashboard pages", () => {
  it("keeps Overview to four quick-look metrics and three priority actions", () => {
    const html = render("/");

    expect(html.match(/class="kpi"/g)).toHaveLength(4);
    expect(html.match(/class="work-item"/g)).toHaveLength(3);
    expect(html).toContain("Next best work");
    expect(html).toContain("Pipeline snapshot");
    expect(html).toContain("Integration health");
    expect(html).not.toContain("data-leads-table");
    expect(html).not.toContain("AI team");
  });

  it("renders a desktop table and equivalent mobile cards on Leads", () => {
    const html = render("/leads");

    expect(html).toContain("data-leads-table");
    expect(html).toContain('class="mobile-card-list"');
    expect(html).toContain('href="/leads/demo"');
    expect(html).toContain("demo &amp; Sons");
    expect(html).not.toContain("demo & Sons");
  });

  it("groups real leads into server-controlled pipeline stages", () => {
    const html = render("/pipeline");

    expect(html).toContain('aria-label="Lead pipeline board"');
    expect(html).toContain("Audited");
    expect(html).toContain("Qualified");
    expect(html).toContain("Demo ready");
    expect(html).toContain("Human approval remains required");
    expect(html).not.toContain("draggable=");
  });

  it("does not show preview controls for capabilities the server lacks", () => {
    const unavailable = render("/previews");
    const generationEnabled = render("/previews", leads, {
      generatePreview: true,
    });

    expect(unavailable).toContain("Preview generation is not available");
    expect(unavailable).not.toContain("generateLead(");
    expect(unavailable).not.toContain("uploadPreview(");
    expect(unavailable).not.toContain("restoreGeneratedPreview(");
    expect(generationEnabled).toContain("generateLead(");
    expect(generationEnabled).not.toContain("uploadPreview(");
  });

  it.each([
    ["/agents", "AI team", "cannot send without human approval"],
    ["/inbox", "Inbox is ready for real work", "No invented messages"],
    ["/accounting", "Read-only accounting", "Zoho Books remains read only"],
    ["/legal", "Legal support", "does not sign or accept"],
    ["/integrations", "Integration health", "Human approval required"],
    ["/settings", "Configuration status", "Secret values are never displayed"],
  ])("renders truthful %s content", (pathname, heading, boundary) => {
    const html = render(pathname);

    expect(html).toContain(heading);
    expect(html).toContain(boundary);
  });

  it("renders actionable empty states instead of invented activity", () => {
    expect(render("/", [])).toContain("No work is waiting");
    expect(render("/leads", [])).toContain("No leads yet");
    expect(render("/pipeline", [])).toContain("No leads in this stage");
    expect(render("/previews", [])).toContain("No private previews yet");
  });
});
