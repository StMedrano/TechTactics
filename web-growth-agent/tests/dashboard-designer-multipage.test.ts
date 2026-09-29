import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildDashboardViewModel,
  parseDashboardPage,
} from "../src/dashboard-model.js";

import {
  renderDashboardPage,
} from "../src/dashboard-pages.js";

import type {
  Lead,
  LeadPreviewState,
} from "../src/types.js";

const now =
  "2026-09-29T12:00:00.000Z";

function makeLead(
  preview: LeadPreviewState,
): Lead {
  return {
    id: "lead_designer_ui",
    businessName:
      "Example Local Business",
    category:
      "Local service",
    market:
      "Prairieville, LA",
    discoveredAt: now,
    updatedAt: now,
    stage:
      "demo_ready",
    approvedForOutreach:
      false,
    notes: [],
    demoPath:
      "artifacts/lead_designer_ui/demo/index.html",
    preview,
  } as unknown as Lead;
}

function render(
  path: string,
  lead: Lead,
): string {
  const page =
    parseDashboardPage(path);

  if (!page) {
    throw new Error(
      `Page not found: ${path}`,
    );
  }

  return renderDashboardPage(
    buildDashboardViewModel(
      [lead],
      page,
      {
        generatePreview: true,
        uploadPreview: true,
        restoreGeneratedPreview:
          true,
      },
    ),
  );
}

describe(
  "multipage Designer UI",
  () => {
    it(
      "shows generated Designer metadata and actions on Previews",
      () => {
        const html =
          render(
            "/previews",
            makeLead({
              source:
                "generated",
              updatedAt: now,
              generatedAt: now,
              entrypoint:
                "index.html",
              previewUrlPath:
                "/preview/lead_designer_ui/",
              designSkill:
                "techtactics-ui-design",
              designMode:
                "persuade",
              designEngine:
                "designer-agent",
            }),
          );

        expect(html)
          .toContain(
            "GENERATED",
          );

        expect(html)
          .toContain(
            "Generated Preview",
          );

        expect(html)
          .toContain(
            "TechTactics UI Design · Persuade",
          );

        expect(html)
          .toContain(
            "Preview Website",
          );

        expect(html)
          .toContain(
            "Regenerate",
          );

        expect(html)
          .toContain(
            "Upload My Website",
          );

        expect(html)
          .not.toContain(
            "Restore Generated Version",
          );
      },
    );

    it(
      "shows uploaded preview controls separately from generated preview",
      () => {
        const html =
          render(
            "/previews",
            makeLead({
              source:
                "uploaded",
              updatedAt: now,
              generatedAt: now,
              entrypoint:
                "index.html",
              previewUrlPath:
                "/preview/lead_designer_ui/",
              uploadedFileName:
                "customer-site.zip",
            }),
          );

        expect(html)
          .toContain(
            "UPLOADED",
          );

        expect(html)
          .toContain(
            "Uploaded Preview",
          );

        expect(html)
          .toContain(
            "customer-site.zip",
          );

        expect(html)
          .toContain(
            "Regenerate Generated Version",
          );

        expect(html)
          .toContain(
            "Upload My Website",
          );

        expect(html)
          .toContain(
            "Restore Generated Version",
          );
      },
    );

    it(
      "shows Designer readiness from the mandatory TechTactics skill",
      () => {
        const page =
          parseDashboardPage(
            "/agents",
          );

        if (!page) {
          throw new Error(
            "Agents page missing",
          );
        }

        const html =
          renderDashboardPage(
            buildDashboardViewModel(
              [],
              page,
            ),
          );

        expect(html)
          .toContain(
            "Active · TechTactics UI Design",
          );
      },
    );

    it(
      "keeps detailed preview controls off the quick-look overview",
      () => {
        const html =
          render(
            "/",
            makeLead({
              source:
                "generated",
              updatedAt: now,
              generatedAt: now,
              entrypoint:
                "index.html",
              previewUrlPath:
                "/preview/lead_designer_ui/",
              designSkill:
                "techtactics-ui-design",
              designMode:
                "persuade",
              designEngine:
                "designer-agent",
            }),
          );

        expect(html)
          .not.toContain(
            "Upload My Website",
          );

        expect(html)
          .not.toContain(
            "Restore Generated Version",
          );
      },
    );
  },
);

describe(
  "multipage preview wiring",
  () => {
    it(
      "enables upload and restore capabilities from the server",
      () => {
        const source =
          readFileSync(
            new URL(
              "../src/server.ts",
              import.meta.url,
            ),
            "utf8",
          );

        expect(source)
          .toMatch(
            /uploadPreview:\s*true/,
          );

        expect(source)
          .toMatch(
            /restoreGeneratedPreview:\s*true/,
          );
      },
    );

    it(
      "uses the API multipart field named site",
      () => {
        const source =
          readFileSync(
            new URL(
              "../src/dashboard-shell.ts",
              import.meta.url,
            ),
            "utf8",
          );

        expect(source)
          .toContain(
            "data.append('site',file)",
          );

        expect(source)
          .not.toContain(
            "data.append('preview',file)",
          );
      },
    );
  },
);
