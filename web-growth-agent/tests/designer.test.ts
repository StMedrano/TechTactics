import {
  mkdtemp,
  mkdir,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  deterministicWebsiteDesignSpec
} from "../src/design-spec.js";

import {
  generateWebsiteDesign
} from "../src/designer.js";

import type {
  Lead,
  SalesAssets
} from "../src/types.js";

const lead: Lead = {
  id: "lead_designer_agent",
  source: "fixture",
  businessName:
    "Designer Test Company",
  category:
    "Electrician",
  market:
    "Baton Rouge LA",
  phone:
    "555-555-0199",
  discoveredAt:
    "2026-09-28T00:00:00.000Z",
  updatedAt:
    "2026-09-28T00:00:00.000Z",
  stage:
    "qualified",
  approvedForOutreach:
    false,
  notes: []
};

const assets: SalesAssets = {
  generatedAt:
    "2026-09-28T00:00:00.000Z",

  businessSummary:
    "Verified business summary",

  outreachDraft:
    "Verified outreach draft",

  proposalMarkdown:
    "# Proposal",

  demoHeadline:
    "Electrical service made easier to understand",

  demoSubheadline:
    "A private modern website concept.",

  demoServices: [
    "Electrical services",
    "Customer contact",
    "Mobile-friendly experience"
  ],

  recommendedPackage:
    "Launch"
};

async function createResources():
Promise<string> {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "wga-designer-agent-"
      )
    );

  await mkdir(
    path.join(
      root,
      "agents"
    ),
    {
      recursive: true
    }
  );

  await mkdir(
    path.join(
      root,
      "company-os",
      "skills"
    ),
    {
      recursive: true
    }
  );

  await writeFile(
    path.join(
      root,
      "agents",
      "designer.md"
    ),
    [
      "# Designer Agent",
      "",
      "MANDATORY DESIGNER CONTRACT"
    ].join("\n"),
    "utf8"
  );

  await writeFile(
    path.join(
      root,
      "company-os",
      "skills",
      "techtactics-ui-design.md"
    ),
    [
      "# TechTactics UI Design",
      "",
      "Skill name: `techtactics-ui-design`",
      "",
      "MANDATORY UI SKILL"
    ].join("\n"),
    "utf8"
  );

  return root;
}

describe(
  "skill-driven Web Designer",
  () => {
    it(
      "accepts a valid Groq design",
      async () => {
        const rootDir =
          await createResources();

        const expected =
          deterministicWebsiteDesignSpec(
            lead,
            assets
          );

        let capturedPrompt = "";

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                false,

              groq:
                async prompt => {
                  capturedPrompt =
                    prompt;

                  return JSON.stringify(
                    expected
                  );
                }
            }
          );

        expect(result).toEqual(
          expected
        );

        expect(
          capturedPrompt
        ).toContain(
          "MANDATORY DESIGNER CONTRACT"
        );

        expect(
          capturedPrompt
        ).toContain(
          "MANDATORY UI SKILL"
        );

        expect(
          capturedPrompt
        ).toContain(
          "Designer Test Company"
        );

        expect(
          capturedPrompt
        ).toContain(
          "techtactics-ui-design"
        );
      }
    );

    it(
      "gives providers an exact no-extra-keys WebsiteDesignSpec example",
      async () => {
        const rootDir =
          await createResources();

        const expected =
          deterministicWebsiteDesignSpec(
            lead,
            assets
          );

        let capturedPrompt = "";

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                false,

              groq:
                async prompt => {
                  capturedPrompt =
                    prompt;

                  return JSON.stringify(
                    expected
                  );
                }
            }
          );

        expect(result).toEqual(
          expected
        );

        expect(
          capturedPrompt
        ).toContain(
          "CANONICAL VALID WEBSITEDESIGNSPEC EXAMPLE"
        );

        expect(
          capturedPrompt
        ).toContain(
          '"skill": "techtactics-ui-design"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"primaryCta": "Call Now"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"semanticHeadings": true'
        );

        expect(
          capturedPrompt
        ).toContain(
          "Top-level keys ONLY"
        );

        expect(
          capturedPrompt
        ).toContain(
          "Each section object may contain ONLY"
        );

        expect(
          capturedPrompt
        ).toContain(
          "Forbidden alias keys"
        );

        expect(
          capturedPrompt
        ).toContain(
          '"content"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"heading"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"steps"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"buttonLabel"'
        );

        expect(
          capturedPrompt
        ).toContain(
          '"hierarchyVerified"'
        );

        expect(
          capturedPrompt
        ).toContain(
          "Do not add, rename, or omit required keys."
        );
      }
    );

    it(
      "falls back from invalid Groq output to Gemini",
      async () => {
        const rootDir =
          await createResources();

        const expected =
          deterministicWebsiteDesignSpec(
            lead,
            assets
          );

        let geminiCalls = 0;

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                true,

              groq:
                async () =>
                  JSON.stringify({
                    html:
                      "<script>alert(1)</script>"
                  }),

              gemini:
                async () => {
                  geminiCalls += 1;

                  return JSON.stringify(
                    expected
                  );
                }
            }
          );

        expect(result).toEqual(
          expected
        );

        expect(
          geminiCalls
        ).toBe(1);
      }
    );

    it(
      "falls back from Groq transport failure to Gemini",
      async () => {
        const rootDir =
          await createResources();

        const expected =
          deterministicWebsiteDesignSpec(
            lead,
            assets
          );

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                true,

              groq:
                async () => {
                  throw new Error(
                    "simulated Groq outage"
                  );
                },

              gemini:
                async () =>
                  JSON.stringify(
                    expected
                  )
            }
          );

        expect(result).toEqual(
          expected
        );
      }
    );

    it(
      "uses deterministic design when all model output is invalid",
      async () => {
        const rootDir =
          await createResources();

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                true,

              groq:
                async () =>
                  JSON.stringify({
                    javascript:
                      "alert(1)"
                  }),

              gemini:
                async () =>
                  JSON.stringify({
                    css:
                      "body{display:none}"
                  })
            }
          );

        expect(result).toEqual(
          deterministicWebsiteDesignSpec(
            lead,
            assets
          )
        );
      }
    );

    it(
      "uses deterministic design when no AI providers are configured",
      async () => {
        const rootDir =
          await createResources();

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              groqEnabled:
                false,

              geminiEnabled:
                false
            }
          );

        expect(result).toEqual(
          deterministicWebsiteDesignSpec(
            lead,
            assets
          )
        );
      }
    );

    it(
      "does not allow invalid AI output to bypass WebsiteDesignSpec validation",
      async () => {
        const rootDir =
          await createResources();

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                false,

              groq:
                async () =>
                  JSON.stringify({
                    skill:
                      "techtactics-ui-design",

                    mode:
                      "persuade",

                    html:
                      "<iframe src='https://evil.example'></iframe>"
                  })
            }
          );

        expect(result).toEqual(
          deterministicWebsiteDesignSpec(
            lead,
            assets
          )
        );
      }
    );

    it(
      "rejects production-style provider schema drift",
      async () => {
        const rootDir =
          await createResources();

        const result =
          await generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              primaryProvider:
                "groq",

              groqEnabled:
                true,

              geminiEnabled:
                false,

              groq:
                async () =>
                  JSON.stringify({
                    skill:
                      "techtactics-ui-design",

                    mode:
                      "persuade",

                    designRead:
                      false,

                    theme: {
                      palette:
                        "professional-light",

                      radius:
                        "soft",

                      typography:
                        "system-modern",

                      density:
                        "moderate",

                      motion:
                        "restrained"
                    },

                    hero: {
                      headline:
                        assets.demoHeadline,

                      subheadline:
                        assets.demoSubheadline,

                      summary:
                        "Not allowed"
                    },

                    sections: [
                      {
                        type:
                          "services",

                        title:
                          "Services",

                        content:
                          assets.demoServices
                      },

                      {
                        type:
                          "about",

                        heading:
                          "About",

                        content:
                          assets.businessSummary
                      }
                    ],

                    quality: {
                      semanticHeadings:
                        false,

                      visibleFocus:
                        false,

                      reducedMotion:
                        false,

                      mobileFirst:
                        false,

                      hierarchyVerified:
                        true
                    }
                  })
            }
          );

        expect(result).toEqual(
          deterministicWebsiteDesignSpec(
            lead,
            assets
          )
        );
      }
    );

    it(
      "fails before calling AI when mandatory Designer resources are missing",
      async () => {
        const rootDir =
          await mkdtemp(
            path.join(
              os.tmpdir(),
              "wga-designer-missing-"
            )
          );

        let providerCalls = 0;

        await expect(
          generateWebsiteDesign(
            lead,
            assets,
            {
              rootDir,

              groqEnabled:
                true,

              geminiEnabled:
                false,

              groq:
                async () => {
                  providerCalls += 1;

                  return "{}";
                }
            }
          )
        ).rejects.toThrow(
          /Designer runtime configuration error/
        );

        expect(
          providerCalls
        ).toBe(0);
      }
    );
  }
);
