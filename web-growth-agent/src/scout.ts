import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "./config.js";
import { LeadStore } from "./store.js";
import type { Lead, LeadSource, WebsiteDiscoveryStatus } from "./types.js";
import { nowIso, stableId, unique } from "./utils.js";

export type ScoutSource = "auto" | "gemini" | "osm";

export interface ScoutOptions {
  market: string;
  category: string;
  maxResults?: number;
  source?: ScoutSource;
}

export interface ScoutCandidate {
  source: LeadSource;
  sourceId: string;
  businessName: string;
  category?: string;
  market: string;
  address?: string;
  phone?: string;
  website?: string;
  sourceUrls: string[];
  discoveryQueries?: string[];
  websiteDiscoveryStatus: WebsiteDiscoveryStatus;
  notes: string[];
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface ScoutDependencies {
  osm: (options: ScoutOptions) => Promise<ScoutCandidate[]>;
  gemini: (options: ScoutOptions) => Promise<ScoutCandidate[]>;
  fallbackOnGeminiQuota?: boolean;
  geminiEnabled?: boolean;
}

const GeminiBusinessSchema = z.object({
  businessName: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  sourceUrls: z.array(z.string()).optional().default([])
});

const GeminiResponseSchema = z.object({
  businesses: z.array(GeminiBusinessSchema)
});

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

const OSM_FILTERS: Record<string, string[]> = {
  plumber: ['["craft"="plumber"]'],
  hvac: ['["craft"="hvac"]', '["shop"="heating"]'],
  electrician: ['["craft"="electrician"]'],
  landscaper: ['["craft"="landscaper"]'],
  "roofing contractor": ['["craft"="roofer"]'],
  "auto repair": ['["shop"="car_repair"]'],
  salon: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  barber: ['["shop"="hairdresser"]'],
  accountant: ['["office"="accountant"]']
};

const marketCoordinateCache = new Map<string, Coordinates>();

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini scout response did not contain a JSON object.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function safeUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalize(value: string | undefined): string {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isGeminiQuotaError(error: unknown): boolean {
  const text = errorText(error);
  return /RESOURCE_EXHAUSTED|\b429\b|exceeded your current quota/i.test(text);
}

function leadFingerprint(lead: Pick<Lead, "businessName" | "market" | "website">): string {
  const website = safeUrl(lead.website);
  if (website) {
    try {
      return "web:" + new URL(website).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      // fall through
    }
  }
  return "name:" + normalize(lead.businessName) + "|" + normalize(lead.market);
}

function candidateFingerprint(candidate: ScoutCandidate): string {
  return leadFingerprint(candidate);
}

function groundingMetadata(response: any): { urls: string[]; queries: string[] } {
  const metadata = response?.candidates?.[0]?.groundingMetadata;
  const urls: string[] = [];
  for (const chunk of metadata?.groundingChunks ?? []) {
    const url = safeUrl(chunk?.web?.uri);
    if (url) urls.push(url);
  }
  const queries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return { urls: unique(urls), queries: unique(queries) };
}

export async function searchGeminiWeb(options: ScoutOptions): Promise<ScoutCandidate[]> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required for Gemini web scouting.");
  }

  const maxResults = Math.min(Math.max(options.maxResults ?? 10, 1), 25);
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const prompt = `Find up to ${maxResults} legitimate, currently operating local businesses in the category "${options.category}" serving "${options.market}".

This is lead discovery for a website-services company. Use Google Search and return JSON only:
{
  "businesses": [
    {
      "businessName": "string",
      "category": "string",
      "address": "string if confirmed",
      "phone": "string if confirmed",
      "website": "https://... only when you can identify the business's own website with confidence",
      "sourceUrls": ["public source URLs supporting this business record"]
    }
  ]
}

Rules:
- Do not invent businesses, contact information, websites, services, ratings, or reviews.
- Prefer independent/local businesses over national chains.
- A social-media page or directory page is not the business's own website.
- If no own website is confidently identified, omit "website"; do not guess.
- Include at least one public source URL for each returned business when possible.
- Deduplicate results.
- Stay within the requested market/category.`;

  const response = await client.models.generateContent({
    model: config.scoutModel,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const parsed = GeminiResponseSchema.parse(extractJson(response.text ?? ""));
  const grounding = groundingMetadata(response);

  return parsed.businesses.slice(0, maxResults).map((business) => {
    const website = safeUrl(business.website);
    const sourceUrls = unique(business.sourceUrls.map(safeUrl).filter((url): url is string => Boolean(url)));
    const evidenceUrls = sourceUrls.length ? sourceUrls : grounding.urls.slice(0, 8);
    const sourceId = stableId(
      "gemini",
      [normalize(business.businessName), normalize(options.market), website ? normalize(website) : ""].join("|")
    );

    return {
      source: "gemini_search",
      sourceId,
      businessName: business.businessName.trim(),
      category: business.category?.trim() || options.category,
      market: options.market,
      address: business.address?.trim() || undefined,
      phone: business.phone?.trim() || undefined,
      website,
      sourceUrls: evidenceUrls,
      discoveryQueries: grounding.queries,
      websiteDiscoveryStatus: website ? "found" : "not_found",
      notes: [
        website
          ? "Website was identified during grounded web discovery and must still be verified by the auditor."
          : "No own website was confidently identified during grounded web discovery; this is not proof that no website exists."
      ]
    } satisfies ScoutCandidate;
  });
}

function osmAddress(tags: Record<string, string>): string | undefined {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const locality = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ");
  return [street, locality].filter(Boolean).join(", ") || undefined;
}

export function buildOverpassAroundQuery(options: ScoutOptions, coordinates: Coordinates, radiusMeters: number): string {
  const filters = OSM_FILTERS[options.category.toLowerCase()];
  if (!filters?.length) {
    throw new Error(
      `OpenStreetMap fallback does not yet have a tag mapping for category "${options.category}". Use Gemini scouting or add an OSM tag mapping.`
    );
  }

  const radius = Math.round(Math.min(Math.max(radiusMeters, 1000), 100000));
  const union = filters
    .map((filter) => `nwr${filter}(around:${radius},${coordinates.lat},${coordinates.lon});`)
    .join("\n  ");

  return `[out:json][timeout:25];
(
  ${union}
);
out center;`;
}

export async function resolveMarketCoordinates(market: string): Promise<Coordinates> {
  const cacheKey = normalize(market);
  const cached = marketCoordinateCache.get(cacheKey);
  if (cached) return cached;

  const query = /\b(?:usa|united states)\b/i.test(market) ? market : `${market}, USA`;
  const url = new URL(config.nominatimUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "TechTactics-WebGrowthScout/0.3"
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Market geocoding failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Could not resolve market coordinates for ${market}.`);
  }

  const coordinates = { lat, lon };
  marketCoordinateCache.set(cacheKey, coordinates);
  return coordinates;
}

export async function searchOverpass(options: ScoutOptions): Promise<ScoutCandidate[]> {
  const coordinates = await resolveMarketCoordinates(options.market);
  const query = buildOverpassAroundQuery(options, coordinates, config.osmRadiusMeters);

  const response = await fetch(config.overpassUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TechTactics-WebGrowthScout/0.3"
    },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    throw new Error(`Overpass search failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const maxResults = Math.min(Math.max(options.maxResults ?? 10, 1), 25);
  const candidates: ScoutCandidate[] = [];

  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    if (!name) continue;
    const website = safeUrl(tags["contact:website"] || tags.website);
    const phone = tags["contact:phone"] || tags.phone;
    candidates.push({
      source: "osm_overpass",
      sourceId: `osm:${element.type}/${element.id}`,
      businessName: name,
      category: options.category,
      market: options.market,
      address: osmAddress(tags),
      phone: phone?.trim() || undefined,
      website,
      sourceUrls: [`https://www.openstreetmap.org/${element.type}/${element.id}`],
      websiteDiscoveryStatus: website ? "found" : "not_found",
      notes: [
        `Discovered in OpenStreetMap within approximately ${Math.round(config.osmRadiusMeters / 1000)} km of ${options.market}.`,
        website
          ? "Website URL came from OpenStreetMap tags and must still be verified by the auditor."
          : "No website tag was present in this OpenStreetMap record; this is not proof that no website exists."
      ]
    });
    if (candidates.length >= maxResults) break;
  }
  return candidates;
}

export async function discoverWithFallback(
  options: ScoutOptions,
  dependencies: ScoutDependencies
): Promise<ScoutCandidate[]> {
  const source = options.source ?? "auto";
  if (!["auto", "gemini", "osm"].includes(source)) {
    throw new Error(`Unsupported scout source: ${source}`);
  }

  if (source === "osm") return dependencies.osm(options);

  if (source === "gemini") {
    try {
      return await dependencies.gemini(options);
    } catch (error) {
      if (dependencies.fallbackOnGeminiQuota && isGeminiQuotaError(error)) {
        console.warn("Gemini scout quota exhausted; using OpenStreetMap fallback.");
        return dependencies.osm(options);
      }
      throw error;
    }
  }

  try {
    const osmResults = await dependencies.osm(options);
    if (osmResults.length) return osmResults;
  } catch (error) {
    console.warn("OpenStreetMap scout failed; trying Gemini:", errorText(error));
  }

  if (dependencies.geminiEnabled === false) return [];

  try {
    return await dependencies.gemini(options);
  } catch (error) {
    if (isGeminiQuotaError(error)) {
      console.warn("Gemini scout quota exhausted and OpenStreetMap did not return leads for this search.");
      return [];
    }
    console.warn("Gemini scout failed after OpenStreetMap returned no leads:", errorText(error));
    return [];
  }
}

function candidateToLead(candidate: ScoutCandidate): Lead {
  const now = nowIso();
  return {
    id: stableId("lead", candidate.source + ":" + candidate.sourceId),
    source: candidate.source,
    sourceId: candidate.sourceId,
    sourceUrls: candidate.sourceUrls,
    discoveryQueries: candidate.discoveryQueries,
    websiteDiscoveryStatus: candidate.websiteDiscoveryStatus,
    businessName: candidate.businessName,
    category: candidate.category,
    market: candidate.market,
    address: candidate.address,
    phone: candidate.phone,
    website: candidate.website,
    discoveredAt: now,
    updatedAt: now,
    stage: "new",
    approvedForOutreach: false,
    notes: candidate.notes
  };
}

function mergeExisting(existing: Lead, discovered: Lead): Lead {
  return {
    ...existing,
    sourceUrls: unique([...(existing.sourceUrls ?? []), ...(discovered.sourceUrls ?? [])]),
    discoveryQueries: unique([...(existing.discoveryQueries ?? []), ...(discovered.discoveryQueries ?? [])]),
    websiteDiscoveryStatus: discovered.website ? "found" : (existing.websiteDiscoveryStatus ?? discovered.websiteDiscoveryStatus),
    businessName: discovered.businessName,
    category: discovered.category ?? existing.category,
    market: discovered.market ?? existing.market,
    address: discovered.address ?? existing.address,
    phone: discovered.phone ?? existing.phone,
    website: discovered.website ?? existing.website,
    updatedAt: nowIso(),
    notes: unique([...(existing.notes ?? []), ...(discovered.notes ?? [])])
  };
}

async function discover(options: ScoutOptions): Promise<ScoutCandidate[]> {
  const source = options.source ?? (config.scoutSource as ScoutSource);
  return discoverWithFallback(
    { ...options, source },
    {
      osm: searchOverpass,
      gemini: searchGeminiWeb,
      fallbackOnGeminiQuota: true,
      geminiEnabled: Boolean(config.geminiApiKey)
    }
  );
}

export async function scoutAndStore(options: ScoutOptions, store = new LeadStore()): Promise<Lead[]> {
  const candidates = await discover(options);
  const current = await store.all();
  const byFingerprint = new Map(current.map((lead) => [leadFingerprint(lead), lead]));
  const saved: Lead[] = [];

  for (const candidate of candidates) {
    const fingerprint = candidateFingerprint(candidate);
    const discovered = candidateToLead(candidate);
    const existing = byFingerprint.get(fingerprint);
    const lead = existing ? mergeExisting(existing, discovered) : discovered;
    await store.upsert(lead);
    byFingerprint.set(fingerprint, lead);
    saved.push(lead);
  }

  return saved;
}
