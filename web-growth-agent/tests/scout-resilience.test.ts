import { describe, expect, it, vi } from "vitest";
import {
  buildOverpassAroundQuery,
  discoverWithFallback,
  isGeminiQuotaError,
  isLikelyChainOsmTags,
  requestOverpassJson
} from "../src/scout.js";

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

const secondCandidate = {
  ...candidate,
  source: "gemini_search" as const,
  sourceId: "gemini:2",
  businessName: "Second Local Plumbing",
  sourceUrls: ["https://example.org/second-local-plumbing"]
};

describe("scout resilience", () => {
  it("recognizes Gemini RESOURCE_EXHAUSTED quota errors", () => {
    expect(isGeminiQuotaError({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } })).toBe(true);
    expect(isGeminiQuotaError(new Error("ordinary failure"))).toBe(false);
  });

  it("supplements sparse OSM results with Gemini and deduplicates", async () => {
    const osm = vi.fn().mockResolvedValue([candidate]);
    const gemini = vi.fn().mockResolvedValue([candidate, secondCandidate]);

    const result = await discoverWithFallback(options, { osm, gemini, geminiEnabled: true });

    expect(result.map((item) => item.businessName)).toEqual(["Example Plumbing", "Second Local Plumbing"]);
    expect(osm).toHaveBeenCalledTimes(1);
    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it("does not call Gemini when OSM already fills the requested result count", async () => {
    const full = Array.from({ length: 5 }, (_, index) => ({
      ...candidate,
      sourceId: `osm:node/${index + 1}`,
      businessName: `Local Plumbing ${index + 1}`
    }));
    const osm = vi.fn().mockResolvedValue(full);
    const gemini = vi.fn().mockResolvedValue([]);

    const result = await discoverWithFallback(options, { osm, gemini, geminiEnabled: true });

    expect(result).toHaveLength(5);
    expect(gemini).not.toHaveBeenCalled();
  });

  it("keeps sparse OSM results when Gemini supplementation hits quota", async () => {
    const osm = vi.fn().mockResolvedValue([candidate]);
    const gemini = vi.fn().mockRejectedValue({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } });

    const result = await discoverWithFallback(options, { osm, gemini, geminiEnabled: true });

    expect(result).toEqual([candidate]);
  });

  it("falls back to OSM when an explicit Gemini attempt hits quota", async () => {
    const osm = vi.fn().mockResolvedValue([candidate]);
    const gemini = vi.fn().mockRejectedValue({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } });

    const result = await discoverWithFallback({ ...options, source: "gemini" }, { osm, gemini, fallbackOnGeminiQuota: true });

    expect(result).toEqual([candidate]);
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(osm).toHaveBeenCalledTimes(1);
  });

  it("tries another Overpass endpoint after a 504", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));

    const result = await requestOverpassJson(
      "[out:json];node(0,0,1,1);out;",
      ["https://primary.example/api/interpreter", "https://secondary.example/api/interpreter"],
      fetchMock as typeof fetch
    );

    expect(result).toEqual({ elements: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://primary.example/api/interpreter");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://secondary.example/api/interpreter");
  });

  it("filters obvious branded or network OSM records from local-independent prospecting", () => {
    expect(isLikelyChainOsmTags({ brand: "Core & Main" })).toBe(true);
    expect(isLikelyChainOsmTags({ network: "National Service Network" })).toBe(true);
    expect(isLikelyChainOsmTags({ "brand:wikidata": "Q123" })).toBe(true);
    expect(isLikelyChainOsmTags({ name: "Bayou Family Plumbing", craft: "plumber" })).toBe(false);
  });

  it("builds a radius-based Overpass query instead of requiring an exact admin boundary", () => {
    const query = buildOverpassAroundQuery(options, { lat: 30.2385, lon: -90.9201 }, 25000);

    expect(query).toContain("around:25000,30.2385,-90.9201");
    expect(query).toContain('[\"craft\"=\"plumber\"]');
    expect(query).not.toContain('boundary\"=\"administrative');
  });
});
