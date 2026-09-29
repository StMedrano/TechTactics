import { describe, expect, it } from "vitest";
import {
  buildDashboardViewModel,
  parseDashboardPage,
  type DashboardPage,
} from "../src/dashboard-model.js";
import { renderDashboardPage } from "../src/dashboard-pages.js";
import type { Lead, LeadStage } from "../src/types.js";

function fixture(stage: LeadStage, overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-workspace",
    source: "fixture",
    businessName: "Bayou <Electric>",
    category: "Electrician",
    market: "Prairieville, LA",
    address: "123 Main Street",
    phone: "225-555-0100",
    website: "https://example.com",
    contactEmail: "owner@example.com",
    discoveredAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    stage,
    approvedForOutreach: stage === "approved",
    approvedOutreachGeneratedAt:
      stage === "approved" ? "2026-09-28T12:00:00.000Z" : undefined,
    audit: {
      checkedAt: "2026-09-28T00:00:00.000Z",
      reachable: true,
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseMs: 1600,
      https: true,
      title: "Bayou Electric",
      hasMetaDescription: false,
      hasViewportMeta: true,
      hasContactForm: false,
      hasPhoneLink: true,
      hasEmailLink: false,
      hasPrimaryCta: false,
      hasStructuredData: false,
      hasAnalyticsMarker: true,
      notes: ["Recorded audit note"],
    },
    score: {
      total: 62,
      calculatedAt: "2026-09-28T00:00:00.000Z",
      items: [
        { key: "cta", label: "Weak CTA", points: 15, evidence: "No primary CTA detected" },
      ],
    },
    salesAssets: {
      generatedAt: "2026-09-28T12:00:00.000Z",
      businessSummary: "Local electrical contractor",
      outreachDraft: "I prepared a private website concept for your review.",
      proposalMarkdown: "Proposal",
      demoHeadline: "Powering Prairieville",
      demoSubheadline: "Licensed local electricians",
      demoServices: ["Repairs", "Panels"],
      recommendedPackage: "Growth",
    },
    demoPath: "/previews/lead-workspace/index.html",
    notes: ["Owner prefers email.", "Follow up after Tuesday."],
    ...overrides,
  };
}

function render(lead: Lead | undefined, capabilities = {}): string {
  const page = parseDashboardPage("/leads/lead-workspace") as DashboardPage;
  return renderDashboardPage(
    buildDashboardViewModel(lead ? [lead] : [], page, capabilities),
  );
}

describe("lead workspace", () => {
  it("renders recorded business, audit, score, preview, outreach, activity, and notes", () => {
    const html = render(fixture("demo_ready"));

    for (const heading of [
      "Business information",
      "Recorded audit evidence",
      "Opportunity score",
      "Private website preview",
      "Outreach draft",
      "Pipeline activity",
      "Notes",
    ]) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("No primary CTA detected");
    expect(html).toContain("Recorded audit note");
    expect(html).toContain("Owner prefers email.");
    expect(html).toContain("Bayou &lt;Electric&gt;");
    expect(html).not.toContain("Bayou <Electric>");
    expect(html).toContain('href="/api/leads/lead-workspace/preview"');
    expect(html).not.toContain('href="/previews/lead-workspace/index.html"');
  });

  it("shows a safe not-found state for a missing lead id", () => {
    const html = render(undefined);

    expect(html).toContain("Lead not found");
    expect(html).toContain('href="/leads"');
    expect(html).not.toContain("undefined");
  });

  it("keeps approval and Zoho sending as distinct state-dependent actions", () => {
    const demoReady = render(fixture("demo_ready"));
    const approved = render(fixture("approved"));

    expect(demoReady).toContain("Approve outreach");
    expect(demoReady).not.toContain("Send through Zoho");
    expect(approved).toContain("Send through Zoho");
    expect(approved).not.toContain("Approve outreach");
    expect(approved).toContain("Send only the approved draft");
  });

  it("disables Zoho sending and explains the missing contact email", () => {
    const html = render(fixture("approved", { contactEmail: undefined }));

    expect(html).toMatch(/<button[^>]*disabled[^>]*>Send through Zoho<\/button>/);
    expect(html).toContain("Add a contact email before sending");
  });

  it("only offers guarded next stages and does not bypass approval or sending", () => {
    const demoReady = render(fixture("demo_ready"));
    const contacted = render(fixture("contacted"));

    expect(demoReady).toContain('<option value="lost">Lost</option>');
    expect(demoReady).not.toContain('<option value="approved">');
    expect(demoReady).not.toContain('<option value="contacted">');
    expect(contacted).toContain('<option value="responded">Responded</option>');
    expect(contacted).toContain('<option value="lost">Lost</option>');
    expect(contacted).not.toContain('<option value="won">');
  });

  it("shows preview actions only when each backend capability is present", () => {
    const unavailable = render(fixture("qualified"));
    const available = render(fixture("qualified"), {
      generatePreview: true,
      uploadPreview: true,
      restoreGeneratedPreview: true,
    });

    expect(unavailable).not.toContain("generateLead(");
    expect(unavailable).not.toContain("uploadPreview(");
    expect(unavailable).not.toContain("restoreGeneratedPreview(");
    expect(available).toContain("generateLead(");
    expect(available).toContain("uploadPreview(");
    expect(available).toContain("restoreGeneratedPreview(");
  });
});
