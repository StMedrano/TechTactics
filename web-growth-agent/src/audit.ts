import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type { AuditEvidence } from "./types.js";
import { nowIso } from "./utils.js";

const CTA_RE = /(get\s+(a\s+)?quote|request\s+(an\s+)?estimate|book\s+now|schedule|contact\s+us|get\s+started|call\s+(us|now))/i;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function has(re: RegExp, value: string): boolean {
  return re.test(value);
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim().slice(0, 200) || undefined;
}

function extractMailto(html: string): string | undefined {
  const match = html.match(/href=["']mailto:([^"'?#\s>]+)(?:\?[^"']*)?["']/i);
  const raw = match?.[1]?.trim();
  if (!raw) return undefined;
  try {
    const decoded = decodeURIComponent(raw);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decoded) ? decoded : undefined;
  } catch {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) ? raw : undefined;
  }
}

function findOldCopyrightYear(html: string): number | undefined {
  const matches = [...html.matchAll(/(?:©|copyright(?:\s*&copy;)?)[^\d]{0,20}(20\d{2})/gi)]
    .map((match) => Number(match[1]))
    .filter((year) => Number.isFinite(year));
  if (!matches.length) return undefined;
  return Math.max(...matches);
}

const BLOCKED_NETWORKS = new BlockList();

[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
].forEach(([address, prefix]) => BLOCKED_NETWORKS.addSubnet(address as string, prefix as number, "ipv4"));

[
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8]
].forEach(([address, prefix]) => BLOCKED_NETWORKS.addSubnet(address as string, prefix as number, "ipv6"));

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const family = isIP(normalized);
  if (family === 4) return BLOCKED_NETWORKS.check(normalized, "ipv4");
  if (family === 6) return BLOCKED_NETWORKS.check(normalized, "ipv6");
  return true;
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Blocked audit URL protocol: " + url.protocol);
  }
  if (url.username || url.password) {
    throw new Error("Blocked audit URL containing credentials.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Blocked private or local audit hostname.");
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) throw new Error("Blocked private or reserved audit address.");
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("Audit hostname did not resolve.");
  for (const entry of addresses) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw new Error("Blocked audit hostname resolving to a private or reserved address.");
    }
  }
}

async function fetchPublicWebsite(initialUrl: string): Promise<{ response: Response; finalUrl: string }> {
  let current = new URL(initialUrl);
  for (let redirects = 0; redirects <= 5; redirects++) {
    await assertPublicHttpUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "TechTactics-WebGrowthAudit/0.1 (+human-reviewed-sales-research)"
      }
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: current.href };
    }

    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: current.href };
    if (redirects === 5) throw new Error("Website exceeded the 5-redirect audit limit.");
    current = new URL(location, current);
  }
  throw new Error("Website redirect processing failed.");
}

export async function auditWebsite(url: string): Promise<AuditEvidence> {
  const started = Date.now();
  const notes: string[] = [];
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

  try {
    const { response, finalUrl } = await fetchPublicWebsite(normalized);
    const responseMs = Date.now() - started;
    const contentType = response.headers.get("content-type") || "";
    const https = finalUrl.startsWith("https://");

    if (!contentType.includes("text/html")) {
      notes.push("Expected HTML but received " + (contentType || "unknown content type") + ".");
    }

    const raw = await response.text();
    const html = raw.slice(0, 2_000_000);
    const lower = html.toLowerCase();
    const contactEmail = extractMailto(html);
    const oldCopyrightYear = findOldCopyrightYear(html);

    if (responseMs > 3000) notes.push("Initial document response took " + responseMs + " ms from the audit runner.");
    if (!https) notes.push("Final page URL is not HTTPS.");
    if (!has(/<meta[^>]+name=["']viewport["'][^>]*>/i, html)) notes.push("No viewport meta tag detected.");
    if (
      !has(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i, html) &&
      !has(/<meta[^>]+content=["'][^"']+["'][^>]+name=["']description["']/i, html)
    ) {
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
      contactEmail,
      hasMetaDescription:
        has(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i, html) ||
        has(/<meta[^>]+content=["'][^"']+["'][^>]+name=["']description["']/i, html),
      hasViewportMeta: has(/<meta[^>]+name=["']viewport["'][^>]*>/i, html),
      hasContactForm: has(/<form[\s>]/i, html) && has(/(contact|quote|estimate|message|inquiry|appointment)/i, html),
      hasPhoneLink: lower.includes('href="tel:') || lower.includes("href='tel:"),
      hasEmailLink: Boolean(contactEmail),
      hasPrimaryCta: CTA_RE.test(html.replace(/<[^>]+>/g, " ")),
      hasStructuredData: lower.includes("application/ld+json"),
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
      notes: ["Website request failed: " + (error instanceof Error ? error.message : String(error))]
    };
  }
}
