import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import type { AuditEvidence } from "./types.js";
import { nowIso } from "./utils.js";

const CTA_RE = /(get\s+(a\s+)?quote|request\s+(an\s+)?estimate|book\s+now|schedule|contact\s+us|get\s+started|call\s+(us|now))/i;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_BODY_BYTES = 2_000_000;

type ResolvedAddress = { address: string; family: 4 | 6 };
type WebsiteResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
  finalUrl: string;
};

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

const BLOCKED_IPV4 = new BlockList();
const BLOCKED_IPV6 = new BlockList();

[
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4]
].forEach(([address, prefix]) => BLOCKED_IPV4.addSubnet(address as string, prefix as number, "ipv4"));

[
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["100::", 64],
  ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]
].forEach(([address, prefix]) => BLOCKED_IPV6.addSubnet(address as string, prefix as number, "ipv6"));

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const family = isIP(normalized);
  if (family === 4) return BLOCKED_IPV4.check(normalized, "ipv4");
  if (family === 6) return BLOCKED_IPV6.check(normalized, "ipv6");
  return true;
}

async function resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
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

  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateOrReservedIp(hostname)) throw new Error("Blocked private or reserved audit address.");
    return { address: hostname, family: literalFamily as 4 | 6 };
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("Audit hostname did not resolve.");
  for (const entry of addresses) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw new Error("Blocked audit hostname resolving to a private or reserved address.");
    }
  }

  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function header(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

async function requestPinned(url: URL, resolved: ResolvedAddress): Promise<Omit<WebsiteResponse, "finalUrl">> {
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = transport(url, {
      method: "GET",
      headers: {
        "User-Agent": "TechTactics-WebGrowthAudit/0.1 (+human-reviewed-sales-research)",
        "Accept": "text/html,application/xhtml+xml"
      },
      lookup: (_hostname, _options, callback) => {
        callback(null, resolved.address, resolved.family);
      }
    }, (res) => {
      const status = res.statusCode || 0;

      if (REDIRECT_STATUSES.has(status)) {
        res.resume();
        resolve({ status, headers: res.headers, body: "" });
        return;
      }

      const chunks: Buffer[] = [];
      let stored = 0;
      res.on("data", (chunk: Buffer | string) => {
        if (stored >= MAX_BODY_BYTES) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remaining = MAX_BODY_BYTES - stored;
        const piece = buffer.subarray(0, remaining);
        chunks.push(piece);
        stored += piece.length;
      });
      res.on("end", () => {
        resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") });
      });
      res.on("error", reject);
    });

    req.setTimeout(12_000, () => req.destroy(new Error("Website request timed out.")));
    req.on("error", reject);
    req.end();
  });
}

async function fetchPublicWebsite(initialUrl: string): Promise<WebsiteResponse> {
  let current = new URL(initialUrl);

  for (let redirects = 0; redirects <= 5; redirects++) {
    const resolved = await resolvePublicAddress(current);
    const response = await requestPinned(current, resolved);

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ...response, finalUrl: current.href };
    }

    const location = header(response.headers, "location");
    if (!location) return { ...response, finalUrl: current.href };
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
    const response = await fetchPublicWebsite(normalized);
    const responseMs = Date.now() - started;
    const contentType = header(response.headers, "content-type");
    const finalUrl = response.finalUrl;
    const https = finalUrl.startsWith("https://");

    if (!contentType.includes("text/html")) {
      notes.push("Expected HTML but received " + (contentType || "unknown content type") + ".");
    }

    const raw = response.body;
    const html = raw.slice(0, MAX_BODY_BYTES);
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
      reachable: response.status >= 200 && response.status < 300,
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
