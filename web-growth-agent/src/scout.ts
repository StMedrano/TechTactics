import { config } from "./config.js";
import { LeadStore } from "./store.js";
import type { Lead } from "./types.js";
import { nowIso, stableId } from "./utils.js";

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
}

interface PlacesResponse {
  places?: GooglePlace[];
}

export interface ScoutOptions {
  market: string;
  category: string;
  maxResults?: number;
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName"
].join(",");

export async function searchGooglePlaces(options: ScoutOptions): Promise<GooglePlace[]> {
  if (!config.googlePlacesApiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is required for live scouting. Use the seed command to evaluate V1 without paid APIs.");
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.googlePlacesApiKey,
      "X-Goog-FieldMask": FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: `${options.category} in ${options.market}`,
      maxResultCount: Math.min(Math.max(options.maxResults ?? 20, 1), 20)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places search failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = (await response.json()) as PlacesResponse;
  return data.places ?? [];
}

function placeToLead(place: GooglePlace, options: ScoutOptions): Lead | undefined {
  if (!place.id || !place.displayName?.text) return undefined;
  const now = nowIso();
  return {
    id: stableId("lead", `google_places:${place.id}`),
    source: "google_places",
    sourceId: place.id,
    businessName: place.displayName.text,
    category: place.primaryTypeDisplayName?.text || options.category,
    market: options.market,
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    googleMapsUrl: place.googleMapsUri,
    rating: place.rating,
    ratingCount: place.userRatingCount,
    discoveredAt: now,
    updatedAt: now,
    stage: "new",
    approvedForOutreach: false,
    notes: []
  };
}

function mergeExisting(existing: Lead, discovered: Lead): Lead {
  return {
    ...existing,
    businessName: discovered.businessName,
    category: discovered.category ?? existing.category,
    market: discovered.market ?? existing.market,
    address: discovered.address ?? existing.address,
    phone: discovered.phone ?? existing.phone,
    website: discovered.website ?? existing.website,
    googleMapsUrl: discovered.googleMapsUrl ?? existing.googleMapsUrl,
    rating: discovered.rating ?? existing.rating,
    ratingCount: discovered.ratingCount ?? existing.ratingCount,
    updatedAt: nowIso()
  };
}

export async function scoutAndStore(options: ScoutOptions, store = new LeadStore()): Promise<Lead[]> {
  const places = await searchGooglePlaces(options);
  const current = await store.all();
  const existingBySource = new Map(current.filter((lead) => lead.sourceId).map((lead) => [lead.sourceId!, lead]));
  const saved: Lead[] = [];

  for (const place of places) {
    const candidate = placeToLead(place, options);
    if (!candidate) continue;
    const existing = candidate.sourceId ? existingBySource.get(candidate.sourceId) : undefined;
    const lead = existing ? mergeExisting(existing, candidate) : candidate;
    await store.upsert(lead);
    saved.push(lead);
  }

  return saved;
}
