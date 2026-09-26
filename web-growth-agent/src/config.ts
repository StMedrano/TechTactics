import "dotenv/config";
import path from "node:path";
import type { AgentRole } from "./types.js";

function csv(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  scoutModel: process.env.WGA_SCOUT_MODEL?.trim() || "gemini-3.5-flash-lite",
  scoutSource: process.env.WGA_SCOUT_SOURCE?.trim().toLowerCase() || "auto",
  overpassUrl: process.env.WGA_OVERPASS_URL?.trim() || "https://overpass-api.de/api/interpreter",
  nominatimUrl: process.env.WGA_NOMINATIM_URL?.trim() || "https://nominatim.openstreetmap.org/search",
  osmRadiusMeters: positiveNumber(process.env.WGA_OSM_RADIUS_METERS, 25000),
  zohoMcpUrl: process.env.ZOHO_MCP_URL?.trim() || "",
  zohoBooksMcpUrl: process.env.ZOHO_BOOKS_MCP_URL?.trim() || "",
  zohoBooksReadTools: csv(process.env.WGA_ZOHO_BOOKS_READ_TOOLS, []),
  host: process.env.WGA_HOST?.trim() || "127.0.0.1",
  port: Number(process.env.WGA_PORT || "4317"),
  dataDir: path.resolve(process.cwd(), process.env.WGA_DATA_DIR || "./data"),
  artifactDir: path.resolve(process.cwd(), process.env.WGA_ARTIFACT_DIR || "./artifacts"),
  defaultMarkets: csv(process.env.WGA_DEFAULT_MARKETS, ["Prairieville LA", "Baton Rouge LA", "Gonzales LA"]),
  defaultCategories: csv(process.env.WGA_DEFAULT_CATEGORIES, [
    "plumber",
    "hvac",
    "electrician",
    "landscaper",
    "roofing contractor",
    "auto repair",
    "salon",
    "barber",
    "accountant"
  ]),
  agentEmails: {
    manager: optional(process.env.WGA_MANAGER_EMAIL),
    scout: optional(process.env.WGA_SCOUT_EMAIL),
    auditor: optional(process.env.WGA_AUDITOR_EMAIL),
    designer: optional(process.env.WGA_DESIGNER_EMAIL),
    sales: optional(process.env.WGA_SALES_EMAIL),
    accounting: optional(process.env.WGA_ACCOUNTING_EMAIL),
    legal: optional(process.env.WGA_LEGAL_EMAIL)
  } satisfies Record<AgentRole, string | undefined>
};
