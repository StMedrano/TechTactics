import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server.js";
import { LeadStore } from "../src/store.js";
import type { Lead } from "../src/types.js";

let directory = "";
let server: Server | undefined;
let baseUrl = "";
let store: LeadStore;

const seedLead: Lead = {
  id: "route-lead",
  source: "fixture",
  businessName: "Route Electric",
  discoveredAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
  stage: "new",
  approvedForOutreach: false,
  notes: [],
};

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "wga-pages-"));
  store = new LeadStore(path.join(directory, "leads.json"));
  await store.upsert(seedLead);
  const app = createApp(store);
  server = await new Promise<Server>((resolve, reject) => {
    const candidate = app.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(candidate);
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

describe("multipage server routes", () => {
  it.each([
    ["/", "Overview"],
    ["/leads", "Leads"],
    ["/leads/route-lead", "Lead Workspace"],
    ["/pipeline", "Pipeline"],
    ["/previews", "Previews"],
    ["/agents", "Agents"],
    ["/inbox", "Inbox"],
    ["/accounting", "Accounting"],
    ["/legal", "Legal"],
    ["/integrations", "Integrations"],
    ["/settings", "Settings"],
  ])("serves %s as the active %s page", async (pathname, title) => {
    const response = await fetch(baseUrl + pathname);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(`<title>${title} · TechTactics Web Growth</title>`);
    expect(html.match(/data-desktop-nav[^>]*aria-current="page"/g)).toHaveLength(1);
  });

  it("returns a safe 404 for an unknown route", async () => {
    const response = await fetch(baseUrl + "/not-a-page");
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain("Page not found");
    expect(html).not.toContain("Error:");
  });

  it("renders a safe missing-lead workspace without exposing internals", async () => {
    const response = await fetch(baseUrl + "/leads/missing");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Lead not found");
    expect(html).not.toContain("ENOENT");
  });

  it("preserves API reads and guarded mutation errors", async () => {
    const leadsResponse = await fetch(baseUrl + "/api/leads");
    const reportResponse = await fetch(baseUrl + "/api/report");
    const approveResponse = await fetch(baseUrl + "/api/leads/route-lead/approve", { method: "POST" });
    const sendResponse = await fetch(baseUrl + "/api/leads/route-lead/send", { method: "POST" });
    const stageResponse = await fetch(baseUrl + "/api/leads/route-lead/stage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "won" }),
    });
    const generateResponse = await fetch(baseUrl + "/api/leads/route-lead/generate", { method: "POST" });

    expect(leadsResponse.status).toBe(200);
    expect((await leadsResponse.json()) as unknown[]).toHaveLength(1);
    expect(reportResponse.status).toBe(200);
    expect((await reportResponse.json()) as { totalLeads: number }).toMatchObject({ totalLeads: 1 });
    expect(approveResponse.status).toBe(400);
    expect(await approveResponse.text()).toContain("Only a demo-ready lead");
    expect(sendResponse.status).toBe(400);
    expect(await sendResponse.text()).toContain("explicit human approval");
    expect(stageResponse.status).toBe(400);
    expect(await stageResponse.text()).toContain("Invalid transition");
    expect(generateResponse.status).toBe(400);
    expect(await generateResponse.text()).toContain("must be qualified");
  });
});
