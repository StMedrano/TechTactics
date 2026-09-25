import type { AuditEvidence } from "./types.js";
import { nowIso } from "./utils.js";

const CTA_RE = /(get\s+(a\s+)?quote|request\s+(an\s+)?estimate|book\s+now|schedule|contact\s+us|get\s+started|call\s+(us|now))/i;

function has(re: RegExp, value: string): boolean {
  return re.test(value);
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim().slice(0, 200) || undefined;
}

function findOldCopyrightYear(html: string): number | undefined {
  const matches = [...html.matchAll(/(?:©|copyright(?:\s*&copy;)?)[^\d]{0,20}(20\d{2})/gi)]
    .map((match) => Number(match[1]))
    .filter((year) => Number.isFinite(year));
  if (!matches.length) return undefined;
  return Math.max(...matches);
}

export async function auditWebsite(url: string): Promise<AuditEvidence> {
  const started = Date.now();
  const notes: string[] = [];
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

  try {
    const response = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "TechTactics-WebGrowthAudit/0.1 (+human-reviewed-sales-research)"
      }
    });
    const responseMs = Date.now() - started;
    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url || normalized;
    const https = finalUrl.startsWith("https://");

    if (!contentType.includes("text/html")) {
      notes.push(`Expected HTML but received ${contentType || "unknown content type"}.`);
    }

    const raw = await response.text();
    const html = raw.slice(0, 2_000_000);
    const lower = html.toLowerCase();
    const oldCopyrightYear = findOldCopyrightYear(html);

    if (responseMs > 3000) notes.push(`Initial document response took ${responseMs} ms from the audit runner.`);
    if (!https) notes.push("Final page URL is not HTTPS.");
    if (!has(/<meta[^>]+name=["']viewport["'][^>]*>/i, html)) notes.push("No viewport meta tag detected.");
    if (!has(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i, html) &&
        !has(/<meta[^>]+content=["'][^"']+["'][^>]+name=["']description["']/i, html)) {
      notes.push("No populated meta description detected in the returned HTML.");
    }

    return {
      checkedAt: nowIso(),
      reachable: response.ok,
      finalUrl,
      statusCode: response.status,
      responseMs,
      https,
      title: extractTitle(html),
      hasMetaDescription:
        has(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i, html) ||
        has(/<meta[^>]+content=["'][^"']+["'][^>]+name=["']description["']/i, html),
      hasViewportMeta: has(/<meta[^>]+name=["']viewport["'][^>]*>/i, html),
      hasContactForm: has(/<form[\s>]/i, html) && has(/(contact|quote|estimate|message|inquiry|appointment)/i, html),
      hasPhoneLink: lower.includes("href=\"tel:") || lower.includes("href='tel:"),
      hasEmailLink: lower.includes("href=\"mailto:") || lower.includes("href='mailto:"),
      hasPrimaryCta: CTA_RE.test(html.replace(/<[^>]+>/g, " ")),
      hasStructuredData: lower.includes('application/ld+json'),
      hasAnalyticsMarker: /(googletagmanager|google-analytics|gtag\(|plausible\.io|matomo|clarity\.ms)/i.test(html),
      oldCopyrightYear,
      contentLength: raw.length,
      notes
    };
  } catch (error) {
    return {
      checkedAt: nowIso(),
      reachable: false,
      https: normalized.startsWith("https://"),
      hasMetaDescription: false,
      hasViewportMeta: false,
      hasContactForm: false,
      hasPhoneLink: false,
      hasEmailLink: false,
      hasPrimaryCta: false,
      hasStructuredData: false,
      hasAnalyticsMarker: false,
      notes: [`Website request failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}
