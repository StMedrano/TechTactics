import type { Lead } from "./types.js";

export interface WebsitePackage {
  name: "Launch" | "Growth" | "Pro";
  priceRange: string;
  description: string;
  includes: string[];
}

export const packages: Record<WebsitePackage["name"], WebsitePackage> = {
  Launch: {
    name: "Launch",
    priceRange: "$750–$1,250",
    description: "A professional first website or compact replacement site.",
    includes: ["Responsive design", "Core service pages", "Contact/quote form", "Local SEO basics", "Analytics setup"]
  },
  Growth: {
    name: "Growth",
    priceRange: "$1,500–$2,500",
    description: "A stronger local lead-generation website for an established business.",
    includes: ["Everything in Launch", "Expanded service content", "Testimonials/reviews section", "Conversion-focused calls to action", "Enhanced local SEO structure"]
  },
  Pro: {
    name: "Pro",
    priceRange: "$3,000–$5,000+",
    description: "Advanced site functionality, integrations, or booking workflows.",
    includes: ["Everything in Growth", "Booking/integration options", "Custom workflows", "Advanced forms", "Priority implementation planning"]
  }
};

export const websiteCare = {
  name: "TechTactics Website Care",
  priceRange: "$79–$149/month",
  includes: ["Hosting", "SSL", "Backups", "Uptime monitoring", "Minor content changes", "Support", "Basic reporting"]
};

export function recommendPackage(lead: Lead): WebsitePackage {
  if (!lead.website) return packages.Launch;
  const score = lead.score?.total ?? 0;
  if (score >= 75) return packages.Pro;
  if (score >= 45) return packages.Growth;
  return packages.Launch;
}
