import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report.js";
import type { Lead } from "../src/types.js";

function lead(id: string, stage: Lead["stage"], score: number, website?: string): Lead {
  return {
    id,
    source: "fixture",
    businessName: id,
    website,
    discoveredAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stage,
    approvedForOutreach: false,
    score: { total: score, items: [], calculatedAt: "2026-01-01T00:00:00.000Z" },
    notes: []
  };
}

describe("buildReport", () => {
  it("counts stages and estimates only active pipeline value", () => {
    const report = buildReport([
      lead("a", "qualified", 40),
      lead("b", "proposal", 60, "https://example.com"),
      lead("c", "lost", 90, "https://example.com")
    ]);
    expect(report.totalLeads).toBe(3);
    expect(report.counts.qualified).toBe(1);
    expect(report.counts.lost).toBe(1);
    expect(report.projectedPipelineValue).toBe(3000);
  });
});
