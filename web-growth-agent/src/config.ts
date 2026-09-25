import "dotenv/config";
import path from "node:path";

function csv(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export const config = {
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY?.trim() || "",
  openAIKey: process.env.OPENAI_API_KEY?.trim() || "",
  openAIModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
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
  ])
};
