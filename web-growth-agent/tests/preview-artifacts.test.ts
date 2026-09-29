import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lead, SalesAssets } from "../src/types.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.resetModules();
});

function lead(source: "generated" | "uploaded" = "generated"): Lead {
  return {
    id: "lead_preview_artifact",
    source: "fixture",
    businessName: "Preview Artifact Business",
    category: "electrician",
    market: "Prairieville LA",
    discoveredAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    stage: "demo_ready",
    approvedForOutreach: false,
    preview:
      source === "uploaded"
        ? {
            source: "uploaded",
            updatedAt: "2026-09-27T00:30:00.000Z",
            entrypoint: "index.html",
            previewUrlPath: "/preview/lead_preview_artifact/",
            uploadedFileName: "custom-site.zip",
            generatedAt: "2026-09-27T00:00:00.000Z"
          }
        : undefined,
    notes: []
  };
}

function assets(): SalesAssets {
  return {
    generatedAt: "2026-09-27T01:00:00.000Z",
    businessSummary: "Summary",
    outreachDraft: "Outreach",
    proposalMarkdown: "# Proposal",
    demoHeadline: "A clearer electrical website",
    demoSubheadline: "A modern local-business website concept.",
    demoServices: ["Electrical service", "Customer contact", "Local service"],
    recommendedPackage: "Launch"
  };
}

async function loadSite(tempRoot: string) {
  process.chdir(tempRoot);
  vi.resetModules();
  return import("../src/site.js");
}

describe("generated preview artifacts", () => {
  it("writes generated preview to demo-generated and demo for a generated lead", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "wga-preview-artifact-"));
    const { writeLeadArtifacts } = await loadSite(tempRoot);

    await writeLeadArtifacts(lead(), assets());

    const generated = await readFile(
      path.join(tempRoot, "artifacts", "lead_preview_artifact", "demo-generated", "index.html"),
      "utf8"
    );

    const active = await readFile(
      path.join(tempRoot, "artifacts", "lead_preview_artifact", "demo", "index.html"),
      "utf8"
    );

    expect(generated).toContain("A clearer electrical website");
    expect(active).toBe(generated);
  });

  it("returns generated preview metadata with relative preview URL", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "wga-preview-artifact-"));
    const { writeLeadArtifacts } = await loadSite(tempRoot);

    const result = await writeLeadArtifacts(lead(), assets());

    expect(result.preview).toEqual({
      source: "generated",
      designSkill: "techtactics-ui-design",
      designMode: "persuade",
      designEngine: "designer-agent",
      updatedAt: "2026-09-27T01:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_preview_artifact/",
      generatedAt: "2026-09-27T01:00:00.000Z"
    });
  });

  it("writes preview-metadata.json consistent with generated state", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "wga-preview-artifact-"));
    const { writeLeadArtifacts } = await loadSite(tempRoot);

    const result = await writeLeadArtifacts(lead(), assets());

    const metadata = JSON.parse(
      await readFile(
        path.join(tempRoot, "artifacts", "lead_preview_artifact", "preview-metadata.json"),
        "utf8"
      )
    );

    expect(metadata).toEqual(result.preview);
  });

  it("regeneration preserves active demo when current preview source is uploaded", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "wga-preview-artifact-"));
    const leadDir = path.join(tempRoot, "artifacts", "lead_preview_artifact");
    const demoDir = path.join(leadDir, "demo");

    await mkdir(demoDir, { recursive: true });
    await writeFile(
      path.join(demoDir, "index.html"),
      "<html>UPLOADED SENTINEL</html>",
      "utf8"
    );

    const { writeLeadArtifacts } = await loadSite(tempRoot);

    const result = await writeLeadArtifacts(lead("uploaded"), assets());

    const active = await readFile(path.join(demoDir, "index.html"), "utf8");
    const generated = await readFile(
      path.join(leadDir, "demo-generated", "index.html"),
      "utf8"
    );

    expect(active).toContain("UPLOADED SENTINEL");
    expect(generated).toContain("A clearer electrical website");
    expect(result.preview.source).toBe("uploaded");
    expect(result.preview.generatedAt).toBe("2026-09-27T01:00:00.000Z");
  });

  it("generated HTML keeps the private concept disclaimer and noindex metadata", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "wga-preview-artifact-"));
    const { writeLeadArtifacts } = await loadSite(tempRoot);

    await writeLeadArtifacts(lead(), assets());

    const html = await readFile(
      path.join(tempRoot, "artifacts", "lead_preview_artifact", "demo-generated", "index.html"),
      "utf8"
    );

    expect(html).toContain('name="robots" content="noindex,nofollow"');
    expect(html).toContain("Private concept preview created by TechTactics");
    expect(html).toContain("this is not an official");
  });
});
