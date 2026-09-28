import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import yazl from "yazl";

import type { Lead } from "../src/types.js";

vi.mock("../src/ai.js", () => ({
  generateSalesAssets: vi.fn(async () => ({
    generatedAt: "2026-09-27T03:00:00.000Z",
    businessSummary: "API generated summary",
    outreachDraft: "API generated outreach",
    proposalMarkdown: "# API Proposal",
    demoHeadline: "API generated headline",
    demoSubheadline: "API generated subheadline",
    demoServices: ["One", "Two", "Three"],
    recommendedPackage: "Launch"
  }))
}));

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );

  vi.unstubAllEnvs();
  vi.resetModules();
});

function lead(stage: Lead["stage"] = "qualified"): Lead {
  return {
    id: "lead_server_preview",
    source: "fixture",
    businessName: "Server Preview Business",
    discoveredAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    stage,
    approvedForOutreach: false,
    notes: []
  };
}

async function zipBuffer(
  files: Array<{ name: string; contents: string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const chunks: Buffer[] = [];

    zip.outputStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    zip.outputStream.on("error", reject);

    zip.outputStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    for (const file of files) {
      zip.addBuffer(
        Buffer.from(file.contents),
        file.name
      );
    }

    zip.end();
  });
}

async function listen(app: {
  listen(
    port: number,
    host: string
  ): Server;
}): Promise<string> {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);

  await once(server, "listening");

  const address = server.address();

  if (
    !address ||
    typeof address === "string"
  ) {
    throw new Error(
      "Unable to determine test server address."
    );
  }

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function setup(
  stage: Lead["stage"] = "qualified"
) {
  const root = await mkdtemp(
    path.join(
      os.tmpdir(),
      "wga-server-preview-"
    )
  );

  vi.stubEnv(
    "WGA_ARTIFACT_DIR",
    path.join(root, "artifacts")
  );

  vi.stubEnv(
    "WGA_DATA_DIR",
    path.join(root, "data")
  );

  vi.resetModules();

  const { LeadStore } =
    await import("../src/store.js");

  const store = new LeadStore(
    path.join(root, "data", "leads.json")
  );

  await store.upsert(lead(stage));

  const serverModule =
    await import("../src/server.js");

  const app =
    serverModule.createServerApp(store);

  const baseUrl = await listen(app);

  return {
    root,
    store,
    baseUrl
  };
}

describe("command-center preview API", () => {
  it("generate returns updated demo_ready lead", async () => {
    const { baseUrl } =
      await setup("qualified");

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/generate`,
      {
        method: "POST"
      }
    );

    expect(response.status).toBe(200);

    const body =
      (await response.json()) as Lead;

    expect(body.stage).toBe("demo_ready");
    expect(body.preview?.source).toBe("generated");
    expect(body.preview?.generatedAt).toBe(
      "2026-09-27T03:00:00.000Z"
    );
    expect(body.approvedForOutreach).toBe(false);
  });

  it("upload without multipart field site returns 400", async () => {
    const { baseUrl } =
      await setup("qualified");

    const form = new FormData();

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/upload-preview`,
      {
        method: "POST",
        body: form
      }
    );

    expect(response.status).toBe(400);

    const body = await response.text();

    expect(body).toMatch(/site|file|upload/i);
  });

  it("oversized compressed upload returns 400", async () => {
    const { baseUrl } =
      await setup("qualified");

    const form = new FormData();

    form.append(
      "site",
      new Blob([
        Uint8Array.from(
          Buffer.alloc(
            25 * 1024 * 1024 + 1
          )
        )
      ]),
      "oversized.zip"
    );

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/upload-preview`,
      {
        method: "POST",
        body: form
      }
    );

    expect(response.status).toBe(400);

    const body = await response.text();

    expect(body).toMatch(
      /size|large|limit|upload/i
    );
  });

  it("valid ZIP upload returns updated preview metadata", async () => {
    const { baseUrl } =
      await setup("qualified");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Customer Website</html>"
      }
    ]);

    const form = new FormData();

    form.append(
      "site",
      new Blob([
        Uint8Array.from(zip)
      ]),
      "customer-site.zip"
    );

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/upload-preview`,
      {
        method: "POST",
        body: form
      }
    );

    expect(response.status).toBe(200);

    const body =
      (await response.json()) as Lead;

    expect(body.stage).toBe("demo_ready");
    expect(body.preview?.source).toBe("uploaded");
    expect(
      body.preview?.uploadedFileName
    ).toBe("customer-site.zip");
    expect(body.approvedForOutreach).toBe(false);
  });

  it("upload from an ineligible lead stage returns 400", async () => {
    const { baseUrl } =
      await setup("audited");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Customer Website</html>"
      }
    ]);

    const form = new FormData();

    form.append(
      "site",
      new Blob([
        Uint8Array.from(zip)
      ]),
      "customer-site.zip"
    );

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/upload-preview`,
      {
        method: "POST",
        body: form
      }
    );

    expect(response.status).toBe(400);

    expect(
      await response.text()
    ).toMatch(/qualified|stage/i);
  });

  it("restore without generated preview returns 400", async () => {
    const { baseUrl } =
      await setup("demo_ready");

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/restore-generated-preview`,
      {
        method: "POST"
      }
    );

    expect(response.status).toBe(400);

    expect(
      await response.text()
    ).toMatch(/generated preview/i);
  });

  it("unexpected server exception returns generic 500 without leaking details", async () => {
    const root = await mkdtemp(
      path.join(
        os.tmpdir(),
        "wga-server-preview-error-"
      )
    );

    vi.stubEnv(
      "WGA_ARTIFACT_DIR",
      path.join(root, "artifacts")
    );

    vi.stubEnv(
      "WGA_DATA_DIR",
      path.join(root, "data")
    );

    vi.resetModules();

    const { LeadStore } =
      await import("../src/store.js");

    class ExplodingStore extends LeadStore {
      override async get(): Promise<Lead | undefined> {
        const error = new Error(
          "SECRET INTERNAL FILESYSTEM DETAIL"
        ) as NodeJS.ErrnoException;

        error.code = "EIO";

        throw error;
      }
    }

    const store = new ExplodingStore(
      path.join(root, "data", "leads.json")
    );

    const serverModule =
      await import("../src/server.js");

    const app =
      serverModule.createServerApp(store);

    const baseUrl =
      await listen(app);

    const response = await fetch(
      `${baseUrl}/api/leads/lead_server_preview/generate`,
      {
        method: "POST"
      }
    );

    expect(response.status).toBe(500);

    const body = await response.text();

    expect(body).toMatch(
      /internal server error/i
    );

    expect(body).not.toContain(
      "SECRET INTERNAL FILESYSTEM DETAIL"
    );

    expect(body).not.toContain(
      "ExplodingStore"
    );
  });
});
