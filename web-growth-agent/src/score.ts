import type { AuditEvidence, Lead, OpportunityScore, ScoreItem } from "./types.js";
import { nowIso } from "./utils.js";

function add(items: ScoreItem[], key: string, label: string, points: number, evidence: string): void {
  items.push({ key, label, points, evidence });
}

export function calculateOpportunityScore(lead: Lead, currentYear = new Date().getFullYear()): OpportunityScore {
  const items: ScoreItem[] = [];

  if (!lead.website) {
    add(items, "no_website", "No website listed", 40, "The business record has no website URL.");
    return { total: 40, items, calculatedAt: nowIso() };
  }

  const audit = lead.audit;
  if (!audit) return { total: 0, items, calculatedAt: nowIso() };

  if (!audit.reachable) {
    add(items, "unreachable", "Website was not reachable", 30, audit.notes.join(" ") || "The audit request did not succeed.");
  }
  if (!audit.hasViewportMeta) {
    add(items, "mobile", "No viewport meta tag", 20, "Returned HTML did not include a viewport meta tag.");
  }
  if ((audit.responseMs ?? 0) > 3000) {
    add(items, "slow_response", "Slow initial document response", 15, `Audit runner observed ${audit.responseMs} ms.`);
  }
  if (!audit.hasPrimaryCta) {
    add(items, "cta", "No common primary call-to-action detected", 15, "No common quote, booking, scheduling, contact, or get-started CTA was detected.");
  }
  if (!audit.https) {
    add(items, "https", "Website is not served over HTTPS", 10, `Final URL: ${audit.finalUrl ?? lead.website}`);
  }
  if (!audit.title || !audit.hasMetaDescription) {
    add(items, "seo_basics", "Missing basic page metadata", 10, `Title: ${audit.title ? "present" : "missing"}; meta description: ${audit.hasMetaDescription ? "present" : "missing"}.`);
  }
  if (!audit.hasContactForm && !audit.hasPhoneLink && !audit.hasEmailLink) {
    add(items, "lead_capture", "No obvious contact path detected", 10, "No contact/quote form, tel link, or mailto link was detected.");
  }
  if (!audit.hasStructuredData) {
    add(items, "structured_data", "No JSON-LD structured data detected", 5, "Returned HTML did not contain application/ld+json.");
  }
  if (audit.oldCopyrightYear && audit.oldCopyrightYear <= currentYear - 3) {
    add(items, "old_copyright", "Old copyright year detected", 5, `Latest detected copyright year: ${audit.oldCopyrightYear}.`);
  }

  const total = Math.min(100, items.reduce((sum, item) => sum + item.points, 0));
  return { total, items, calculatedAt: nowIso() };
}

export function shouldQualify(lead: Lead, minScore = 35): boolean {
  return (lead.score?.total ?? 0) >= minScore;
}

export function auditSummary(audit: AuditEvidence | undefined): string {
  if (!audit) return "Not audited";
  if (!audit.reachable) return "Website unreachable";
  const positives = [
    audit.https && "HTTPS",
    audit.hasViewportMeta && "mobile viewport",
    audit.hasPrimaryCta && "CTA",
    audit.hasContactForm && "form"
  ].filter(Boolean);
  return positives.length ? `Detected: ${positives.join(", ")}` : "Few conversion/technical signals detected";
}
