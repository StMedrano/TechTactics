import { describe, expect, it } from "vitest";
import {
  buildDashboardViewModel,
  parseDashboardPage,
  type DashboardPage,
} from "../src/dashboard-model.js";
import type { Lead, LeadStage } from "../src/types.js";

function lead(id: string, stage: LeadStage, updatedAt: string): Lead {
  return {
    id,
    source: "fixture",
    businessName: `${id} business`,
    discoveredAt: "2026-09-01T00:00:00.000Z",
    updatedAt,
    stage,
    approvedForOutreach: stage === "approved",
    notes: [],
  };
}

describe("dashboard page parsing", () => {
  it.each([
    ["/", "overview"],
    ["/leads", "leads"],
    ["/pipeline", "pipeline"],
    ["/previews", "previews"],
    ["/agents", "agents"],
    ["/inbox", "inbox"],
    ["/accounting", "accounting"],
    ["/legal", "legal"],
    ["/integrations", "integrations"],
    ["/settings", "settings"],
  ] as const)("maps %s to %s", (pathname, expectedId) => {
    expect(parseDashboardPage(pathname)?.id).toBe(expectedId);
  });

  it("decodes a focused lead workspace route", () => {
    expect(parseDashboardPage("/leads/lead%201")).toMatchObject({
      id: "lead",
      path: "/leads/lead%201",
      leadId: "lead 1",
    });
  });

  it("normalizes the browser-safe trailing slash on a page route", () => {
    expect(parseDashboardPage("/leads/")?.id).toBe("leads");
  });

  it.each(["/missing", "/leads/a/extra"])(
    "rejects the unknown path %s",
    (pathname) => expect(parseDashboardPage(pathname)).toBeUndefined(),
  );
});

describe("dashboard view model", () => {
  const overview = parseDashboardPage("/") as DashboardPage;

  it("returns truthful zero metrics and disabled preview capabilities for an empty store", () => {
    const model = buildDashboardViewModel([], overview);

    expect(model.metrics).toEqual({
      ownerAttention: 0,
      activeLeads: 0,
      projectedPipelineValue: 0,
      totalLeads: 0,
    });
    expect(model.priorityWork).toEqual([]);
    expect(model.capabilities).toEqual({
      generatePreview: false,
      uploadPreview: false,
      restoreGeneratedPreview: false,
    });
  });

  it("orders priority work by workflow urgency and then most recent update", () => {
    const leads = [
      lead("audited-new", "audited", "2026-09-29T04:00:00.000Z"),
      lead("qualified", "qualified", "2026-09-29T03:00:00.000Z"),
      lead("demo-old", "demo_ready", "2026-09-29T01:00:00.000Z"),
      lead("demo-new", "demo_ready", "2026-09-29T02:00:00.000Z"),
      lead("lost", "lost", "2026-09-29T05:00:00.000Z"),
    ];

    const model = buildDashboardViewModel(leads, overview);

    expect(model.priorityWork.map((item) => item.id)).toEqual([
      "demo-new",
      "demo-old",
      "qualified",
    ]);
    expect(model.metrics.ownerAttention).toBe(2);
    expect(model.metrics.activeLeads).toBe(4);
  });

  it("selects the lead named by the route and applies explicit capabilities", () => {
    const page = parseDashboardPage("/leads/selected") as DashboardPage;
    const leads = [
      lead("other", "new", "2026-09-29T01:00:00.000Z"),
      lead("selected", "approved", "2026-09-29T02:00:00.000Z"),
    ];

    const model = buildDashboardViewModel(leads, page, {
      generatePreview: true,
    });

    expect(model.selectedLead?.id).toBe("selected");
    expect(model.capabilities).toEqual({
      generatePreview: true,
      uploadPreview: false,
      restoreGeneratedPreview: false,
    });
  });
});
