import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import yazl from "yazl";

import { LeadStore } from "../src/store.js";
import type { Lead } from "../src/types.js";


vi.mock("../src/ai.js", () => ({
  generateSalesAssets: vi.fn(async () => ({
    generatedAt: "2026-09-27T02:00:00.000Z",
    businessSummary: "Regenerated summary",
    outreachDraft: "Regenerated outreach",
    proposalMarkdown: "# Regenerated Proposal",
    demoHeadline: "Regenerated headline",
    demoSubheadline: "Regenerated subheadline",
    demoServices: ["Alpha", "Beta", "Gamma"],
    recommendedPackage: "Launch"
  }))
}));


vi.mock("../src/designer.js", () => ({
  generateWebsiteDesign: vi.fn(
    async (_lead: unknown, assets: any) => ({
      skill: "techtactics-ui-design",
      mode: "persuade",
      designRead: {
        audience: "Local customers",
        tone: "Professional and trustworthy",
        density: "moderate",
        motion: "restrained"
      },
      theme: {
        palette: "professional-light",
        radius: "soft",
        typography: "system-modern"
      },
      hero: {
        eyebrow: "Local business",
        headline: assets.demoHeadline,
        subheadline: assets.demoSubheadline,
        primaryCta: "Request Information",
        secondaryCta: "View Services"
      },
      sections: [
        {
          type: "services",
          title: "Services",
          items: assets.demoServices
        },
        {
          type: "about",
          title: "About",
          body: assets.businessSummary
        },
        {
          type: "contact",
          title: "Contact",
          body: "Get in touch."
        }
      ],
      quality: {
        semanticHeadings: true,
        visibleFocus: true,
        reducedMotion: true,
        mobileFirst: true
      }
    })
  )
}));


const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.resetModules();
});

async function zipBuffer(
  files: Array<{ name: string; contents: string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const chunks: Buffer[] = [];

    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      zip.addBuffer(Buffer.from(file.contents), file.name);
    }

    zip.end();
  });
}

function baseLead(stage: Lead["stage"] = "qualified"): Lead {
  const approved = stage === "approved";

  return {
    id: "lead_pipeline_preview",
    source: "fixture",
    businessName: "Pipeline Preview Business",
    discoveredAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    stage,
    approvedForOutreach: approved,
    approvedOutreachGeneratedAt: approved
      ? "2026-09-27T00:00:00.000Z"
      : undefined,
    outreachSend: approved
      ? {
          status: "pending",
          attemptId: "attempt-1",
          startedAt: "2026-09-27T00:00:00.000Z",
          to: "customer@example.com",
          subject: "Website"
        }
      : undefined,
    salesAssets: {
      generatedAt: "2026-09-27T00:00:00.000Z",
      businessSummary: "Summary",
      outreachDraft: "Reviewed draft",
      proposalMarkdown: "# Proposal",
      demoHeadline: "Headline",
      demoSubheadline: "Subheadline",
      demoServices: ["One", "Two", "Three"],
      recommendedPackage: "Launch"
    },
    preview: {
      source: "generated",
      updatedAt: "2026-09-27T00:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_pipeline_preview/",
      generatedAt: "2026-09-27T00:00:00.000Z"
    },
    notes: []
  };
}

async function setup(stage: Lead["stage"] = "qualified") {
  const root = await mkdtemp(path.join(os.tmpdir(), "wga-pipeline-preview-"));

  process.chdir(root);
  vi.resetModules();

  const store = new LeadStore(path.join(root, "data", "leads.json"));
  await store.upsert(baseLead(stage));

  return {
    root,
    store,
    pipeline: await import("../src/pipeline.js")
  };
}

describe("preview pipeline lifecycle", () => {
  it("upload moves qualified lead to demo_ready without approval", async () => {
    const { store, pipeline } = await setup("qualified");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Uploaded</html>"
      }
    ]);

    const updated = await pipeline.uploadPreviewForLead(
      "lead_pipeline_preview",
      {
        buffer: zip,
        originalName: "site.zip"
      },
      store
    );

    expect(updated.stage).toBe("demo_ready");
    expect(updated.approvedForOutreach).toBe(false);
    expect(updated.preview?.source).toBe("uploaded");
  });

  it("rejects preview upload before lead is qualified", async () => {
    const { store, pipeline } = await setup("audited");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Uploaded</html>"
      }
    ]);

    await expect(
      pipeline.uploadPreviewForLead(
        "lead_pipeline_preview",
        {
          buffer: zip,
          originalName: "site.zip"
        },
        store
      )
    ).rejects.toThrow(/qualified|stage/i);
  });

  it("upload after approval clears approval timestamp and send state", async () => {
    const { store, pipeline } = await setup("approved");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Replacement</html>"
      }
    ]);

    const updated = await pipeline.uploadPreviewForLead(
      "lead_pipeline_preview",
      {
        buffer: zip,
        originalName: "replacement.zip"
      },
      store
    );

    expect(updated.stage).toBe("demo_ready");
    expect(updated.approvedForOutreach).toBe(false);
    expect(updated.approvedOutreachGeneratedAt).toBeUndefined();
    expect(updated.outreachSend).toBeUndefined();
    expect(updated.preview?.source).toBe("uploaded");
  });

  it("restore after approval clears approval and returns demo_ready", async () => {
    const { root, store, pipeline } = await setup("approved");

    const leadDir = path.join(
      root,
      "artifacts",
      "lead_pipeline_preview"
    );

    await mkdir(path.join(leadDir, "demo-generated"), {
      recursive: true
    });

    await mkdir(path.join(leadDir, "demo"), {
      recursive: true
    });

    await writeFile(
      path.join(leadDir, "demo-generated", "index.html"),
      "<html>Generated</html>",
      "utf8"
    );

    await writeFile(
      path.join(leadDir, "demo", "index.html"),
      "<html>Uploaded</html>",
      "utf8"
    );

    await store.update("lead_pipeline_preview", (current) => ({
      ...current,
      preview: {
        ...current.preview!,
        source: "uploaded",
        uploadedFileName: "uploaded.zip"
      }
    }));

    const updated =
      await pipeline.restoreGeneratedPreviewForLead(
        "lead_pipeline_preview",
        store
      );

    expect(updated.stage).toBe("demo_ready");
    expect(updated.approvedForOutreach).toBe(false);
    expect(updated.approvedOutreachGeneratedAt).toBeUndefined();
    expect(updated.outreachSend).toBeUndefined();
    expect(updated.preview?.source).toBe("generated");
  });

  it("persistence failure rolls back uploaded preview filesystem swap", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "wga-pipeline-preview-")
    );

    process.chdir(root);
    vi.resetModules();

    class FailingStore extends LeadStore {
      failUpdates = false;

      override async update(
        id: string,
        updater: (lead: Lead) => Lead
      ): Promise<Lead> {
        if (this.failUpdates) {
          throw new Error("simulated persistence failure");
        }

        return super.update(id, updater);
      }
    }

    const store = new FailingStore(
      path.join(root, "data", "leads.json")
    );

    await store.upsert(baseLead("demo_ready"));

    const leadDir = path.join(
      root,
      "artifacts",
      "lead_pipeline_preview"
    );

    await mkdir(path.join(leadDir, "demo"), {
      recursive: true
    });

    await writeFile(
      path.join(leadDir, "demo", "index.html"),
      "<html>Original</html>",
      "utf8"
    );

    store.failUpdates = true;

    const pipeline = await import("../src/pipeline.js");

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Replacement</html>"
      }
    ]);

    await expect(
      pipeline.uploadPreviewForLead(
        "lead_pipeline_preview",
        {
          buffer: zip,
          originalName: "replacement.zip"
        },
        store
      )
    ).rejects.toThrow(/persistence/i);

    const active = await readFile(
      path.join(leadDir, "demo", "index.html"),
      "utf8"
    );

    expect(active).toContain("Original");
  });

  it("regeneration updates generated preview state and invalidates approval", async () => {
    const { root, store, pipeline } = await setup("approved");

    const updated = await pipeline.generateForLead(
      "lead_pipeline_preview",
      store
    );

    expect(updated.stage).toBe("demo_ready");
    expect(updated.approvedForOutreach).toBe(false);
    expect(updated.approvedOutreachGeneratedAt).toBeUndefined();
    expect(updated.outreachSend).toBeUndefined();

    expect(updated.salesAssets?.generatedAt).toBe(
      "2026-09-27T02:00:00.000Z"
    );

    expect(updated.preview).toEqual({
      source: "generated",
      updatedAt: "2026-09-27T02:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_pipeline_preview/",
      generatedAt: "2026-09-27T02:00:00.000Z",
      designSkill: "techtactics-ui-design",
      designMode: "persuade",
      designEngine: "designer-agent"
    });

    const generated = await readFile(
      path.join(
        root,
        "artifacts",
        "lead_pipeline_preview",
        "demo-generated",
        "index.html"
      ),
      "utf8"
    );

    const active = await readFile(
      path.join(
        root,
        "artifacts",
        "lead_pipeline_preview",
        "demo",
        "index.html"
      ),
      "utf8"
    );

    expect(generated).toContain("Regenerated headline");
    expect(active).toBe(generated);
  });

  it("regeneration preserves uploaded active preview while refreshing generated copy", async () => {
    const { root, store, pipeline } = await setup("approved");

    const leadDir = path.join(
      root,
      "artifacts",
      "lead_pipeline_preview"
    );

    await mkdir(path.join(leadDir, "demo"), {
      recursive: true
    });

    await mkdir(path.join(leadDir, "demo-generated"), {
      recursive: true
    });

    await writeFile(
      path.join(leadDir, "demo", "index.html"),
      "<html>UPLOADED ACTIVE</html>",
      "utf8"
    );

    await writeFile(
      path.join(leadDir, "demo-generated", "index.html"),
      "<html>OLD GENERATED</html>",
      "utf8"
    );

    await store.update("lead_pipeline_preview", (current) => ({
      ...current,
      preview: {
        source: "uploaded",
        updatedAt: "2026-09-27T01:00:00.000Z",
        entrypoint: "index.html",
        previewUrlPath: "/preview/lead_pipeline_preview/",
        uploadedFileName: "customer-site.zip",
        generatedAt: "2026-09-27T00:00:00.000Z"
      }
    }));

    const updated = await pipeline.generateForLead(
      "lead_pipeline_preview",
      store
    );

    expect(updated.stage).toBe("demo_ready");
    expect(updated.approvedForOutreach).toBe(false);
    expect(updated.approvedOutreachGeneratedAt).toBeUndefined();
    expect(updated.outreachSend).toBeUndefined();

    expect(updated.preview?.source).toBe("uploaded");
    expect(updated.preview?.uploadedFileName).toBe("customer-site.zip");
    expect(updated.preview?.generatedAt).toBe(
      "2026-09-27T02:00:00.000Z"
    );

    expect(updated.preview?.designSkill).toBe(
      "techtactics-ui-design"
    );

    expect(updated.preview?.designMode).toBe(
      "persuade"
    );

    expect(updated.preview?.designEngine).toBe(
      "designer-agent"
    );

    const active = await readFile(
      path.join(leadDir, "demo", "index.html"),
      "utf8"
    );

    const generated = await readFile(
      path.join(leadDir, "demo-generated", "index.html"),
      "utf8"
    );

    expect(active).toContain("UPLOADED ACTIVE");
    expect(generated).toContain("Regenerated headline");
    expect(generated).not.toContain("OLD GENERATED");
  });


  it("writes Designer metadata without exposing private prompt material", async () => {
    const { root, store, pipeline } = await setup("qualified");

    await pipeline.generateForLead(
      "lead_pipeline_preview",
      store
    );

    const metadata = JSON.parse(
      await readFile(
        path.join(
          root,
          "artifacts",
          "lead_pipeline_preview",
          "preview-metadata.json"
        ),
        "utf8"
      )
    );

    expect(metadata.designSkill).toBe(
      "techtactics-ui-design"
    );

    expect(metadata.designMode).toBe(
      "persuade"
    );

    expect(metadata.designEngine).toBe(
      "designer-agent"
    );

    const serialized =
      JSON.stringify(metadata);

    expect(serialized).not.toContain(
      "MANDATORY DESIGNER CONTRACT"
    );

    expect(serialized).not.toContain(
      "GROQ_API_KEY"
    );

    expect(serialized).not.toContain(
      "GEMINI_API_KEY"
    );
  });

  it("Designer failure leaves preview and approval state unchanged", async () => {
    const { root, store, pipeline } = await setup("approved");

    const leadDir = path.join(
      root,
      "artifacts",
      "lead_pipeline_preview"
    );

    await mkdir(
      path.join(leadDir, "demo"),
      { recursive: true }
    );

    await mkdir(
      path.join(leadDir, "demo-generated"),
      { recursive: true }
    );

    await writeFile(
      path.join(
        leadDir,
        "demo",
        "index.html"
      ),
      "<html>ACTIVE BEFORE FAILURE</html>",
      "utf8"
    );

    await writeFile(
      path.join(
        leadDir,
        "demo-generated",
        "index.html"
      ),
      "<html>GENERATED BEFORE FAILURE</html>",
      "utf8"
    );

    const designer =
      await import("../src/designer.js");

    vi.mocked(
      designer.generateWebsiteDesign
    ).mockRejectedValueOnce(
      new Error(
        "Designer runtime configuration error: missing skill"
      )
    );

    await expect(
      pipeline.generateForLead(
        "lead_pipeline_preview",
        store
      )
    ).rejects.toThrow(
      /Designer runtime configuration error/
    );

    const current =
      await store.get(
        "lead_pipeline_preview"
      );

    expect(current?.stage).toBe(
      "approved"
    );

    expect(
      current?.approvedForOutreach
    ).toBe(true);

    expect(
      current?.approvedOutreachGeneratedAt
    ).toBe(
      "2026-09-27T00:00:00.000Z"
    );

    expect(
      current?.outreachSend?.status
    ).toBe("pending");

    const active =
      await readFile(
        path.join(
          leadDir,
          "demo",
          "index.html"
        ),
        "utf8"
      );

    const generated =
      await readFile(
        path.join(
          leadDir,
          "demo-generated",
          "index.html"
        ),
        "utf8"
      );

    expect(active).toContain(
      "ACTIVE BEFORE FAILURE"
    );

    expect(generated).toContain(
      "GENERATED BEFORE FAILURE"
    );
  });

  it("generation persistence failure rolls artifact filesystem back", async () => {
    const root =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "wga-generation-rollback-"
        )
      );

    process.chdir(root);
    vi.resetModules();

    class FailingStore extends LeadStore {
      failUpdates = false;

      override async update(
        id: string,
        updater: (lead: Lead) => Lead
      ): Promise<Lead> {
        if (this.failUpdates) {
          throw new Error(
            "simulated generation persistence failure"
          );
        }

        return super.update(
          id,
          updater
        );
      }
    }

    const store =
      new FailingStore(
        path.join(
          root,
          "data",
          "leads.json"
        )
      );

    await store.upsert(
      baseLead("approved")
    );

    const leadDir =
      path.join(
        root,
        "artifacts",
        "lead_pipeline_preview"
      );

    await mkdir(
      path.join(
        leadDir,
        "demo"
      ),
      {
        recursive: true
      }
    );

    await mkdir(
      path.join(
        leadDir,
        "demo-generated"
      ),
      {
        recursive: true
      }
    );

    await writeFile(
      path.join(
        leadDir,
        "demo",
        "index.html"
      ),
      "<html>ORIGINAL ACTIVE</html>",
      "utf8"
    );

    await writeFile(
      path.join(
        leadDir,
        "demo-generated",
        "index.html"
      ),
      "<html>ORIGINAL GENERATED</html>",
      "utf8"
    );

    await writeFile(
      path.join(
        leadDir,
        "proposal.md"
      ),
      "ORIGINAL PROPOSAL",
      "utf8"
    );

    store.failUpdates = true;

    const pipeline =
      await import(
        "../src/pipeline.js"
      );

    await expect(
      pipeline.generateForLead(
        "lead_pipeline_preview",
        store
      )
    ).rejects.toThrow(
      /persistence/i
    );

    expect(
      await readFile(
        path.join(
          leadDir,
          "demo",
          "index.html"
        ),
        "utf8"
      )
    ).toContain(
      "ORIGINAL ACTIVE"
    );

    expect(
      await readFile(
        path.join(
          leadDir,
          "demo-generated",
          "index.html"
        ),
        "utf8"
      )
    ).toContain(
      "ORIGINAL GENERATED"
    );

    expect(
      await readFile(
        path.join(
          leadDir,
          "proposal.md"
        ),
        "utf8"
      )
    ).toBe(
      "ORIGINAL PROPOSAL"
    );
  });

});
