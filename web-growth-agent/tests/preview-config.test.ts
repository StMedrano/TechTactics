import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lead, LeadPreviewState } from "../src/types.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadConfig() {
  vi.resetModules();
  return (await import("../src/config.js")).config;
}

describe("preview configuration", () => {
  it("defaults preview base URL to http://localhost:4318", async () => {
    vi.stubEnv("WGA_PREVIEW_BASE_URL", "");

    const config = await loadConfig();

    expect(config.previewBaseUrl).toBe("http://localhost:4318");
  });

  it("defaults preview upload limit to 25 MB", async () => {
    vi.stubEnv("WGA_MAX_PREVIEW_UPLOAD_MB", "");

    const config = await loadConfig();

    expect(config.maxPreviewUploadBytes).toBe(25 * 1024 * 1024);
  });

  it("parses WGA_MAX_PREVIEW_UPLOAD_MB as megabytes", async () => {
    vi.stubEnv("WGA_MAX_PREVIEW_UPLOAD_MB", "8");

    const config = await loadConfig();

    expect(config.maxPreviewUploadBytes).toBe(8 * 1024 * 1024);
  });

  it("Lead accepts generated and uploaded preview state", () => {
    const generated: LeadPreviewState = {
      source: "generated",
      updatedAt: "2026-09-27T00:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_preview_test/",
      generatedAt: "2026-09-27T00:00:00.000Z"
    };

    const uploaded: LeadPreviewState = {
      source: "uploaded",
      updatedAt: "2026-09-27T01:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_preview_test/",
      uploadedFileName: "customer-site.zip",
      generatedAt: "2026-09-27T00:00:00.000Z"
    };

    const baseLead: Omit<Lead, "preview"> = {
      id: "lead_preview_test",
      source: "fixture",
      businessName: "Preview Test Business",
      discoveredAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
      stage: "demo_ready",
      approvedForOutreach: false,
      notes: []
    };

    const generatedLead: Lead = {
      ...baseLead,
      preview: generated
    };

    const uploadedLead: Lead = {
      ...baseLead,
      preview: uploaded
    };

    expect(generatedLead.preview?.source).toBe("generated");
    expect(uploadedLead.preview?.source).toBe("uploaded");
    expect(uploadedLead.preview?.entrypoint).toBe("index.html");
  });
});
