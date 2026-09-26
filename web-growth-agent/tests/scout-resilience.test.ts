import { describe, expect, it, vi } from "vitest";
import { buildOverpassAroundQuery, discoverWithFallback, isGeminiQuotaError } from "../src/scout.js";

const options = {
  market: "Prairieville, LA",
  category: "plumber",
  maxResults: 5,
  source: "auto" as const
};

const candidate = {
  source: "osm_overpass" as const,
  sourceId: "osm:node/1",
  businessName: "Example Plumbing",
  category: "plumber",
  market: "Prairieville, LA",
  sourceUrls: ["https://www.openstreetmap.org/node/1"],
  websiteDiscoveryStatus: "not_found" as const,
  notes: []
};

describe("scout resilience", () => {
  it("recognizes Gemini RESOURCE_EXHAUSTED quota errors", () => {
    expect(isGeminiQuotaError({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } })).toBe(true);
    expect(isGeminiQuotaError(new Error("ordinary failure"))).toBe(false);
  });

  it("prefers OSM in auto mode so Gemini quota is not consumed when OSM has leads", async () => {
    const osm = vi.fn().mockResolvedValue([candidate]);
    const gemini = vi.fn().mockResolvedValue([]);

    const result = await discoverWithFallback(options, { osm, gemini });

    expect(result).toEqual([candidate]);
    expect(osm).toHaveBeenCalledTimes(1);
    expect(gemini).not.toHaveBeenCalled();
  });

  it("falls back to OSM when an explicit Gemini attempt hits quota", async () => {
    const osm = vi.fn().mockResolvedValue([candidate]);
    const gemini = vi.fn().mockRejectedValue({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } });

    const result = await discoverWithFallback({ ...options, source: "gemini" }, { osm, gemini, fallbackOnGeminiQuota: true });

    expect(result).toEqual([candidate]);
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(osm).toHaveBeenCalledTimes(1);
  });

  it("builds a radius-based Overpass query instead of requiring an exact admin boundary", () => {
    const query = buildOverpassAroundQuery(options, { lat: 30.2385, lon: -90.9201 }, 25000);

    expect(query).toContain("around:25000,30.2385,-90.9201");
    expect(query).toContain('["craft"="plumber"]');
    expect(query).not.toContain('boundary"="administrative');
  });
});
