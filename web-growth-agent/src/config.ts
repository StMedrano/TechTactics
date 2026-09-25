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

export const config = {
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY?.trim() || "",
  openAIKey: process.env.OPENAI_API_KEY?.trim() || "",
  openAIModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
  zohoMcpUrl: process.env.ZOHO_MCP_URL?.trim() || "",
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
    sales: optional(process.env.WGA_SALES_EMAIL)
  } satisfies Record<AgentRole, string | undefined>
};
