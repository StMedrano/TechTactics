import {
  GoogleGenAI
} from "@google/genai";

import {
  config
} from "./config.js";

import {
  deterministicWebsiteDesignSpec,
  parseWebsiteDesignSpec,
  type WebsiteDesignSpec
} from "./design-spec.js";

import {
  loadDesignerResources
} from "./designer-resources.js";

import type {
  Lead,
  SalesAssets
} from "./types.js";

type DesignerProvider =
  (
    prompt: string
  ) => Promise<string>;

export interface DesignerGenerationOptions {
  rootDir?: string;

  primaryProvider?:
    | "groq"
    | "gemini";

  groqEnabled?:
    boolean;

  geminiEnabled?:
    boolean;

  groq?:
    DesignerProvider;

  gemini?:
    DesignerProvider;
}

function extractJson(
  text: string
): unknown {
  const cleaned =
    text
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /```$/i,
        ""
      )
      .trim();

  const start =
    cleaned.indexOf("{");

  const end =
    cleaned.lastIndexOf("}");

  if (
    start < 0 ||
    end <= start
  ) {
    throw new Error(
      "Designer response did not contain a JSON object."
    );
  }

  return JSON.parse(
    cleaned.slice(
      start,
      end + 1
    )
  );
}

async function generateWithGroq(
  prompt: string
): Promise<string> {
  if (
    !config.groqApiKey
  ) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  const response =
    await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${config.groqApiKey}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            model:
              config.groqModel,

            messages: [
              {
                role:
                  "user",

                content:
                  prompt
              }
            ],

            temperature:
              0.35,

            max_completion_tokens:
              6000,

            response_format: {
              type:
                "json_object"
            }
          })
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Groq Designer request failed with HTTP ${response.status}.`
    );
  }

  const payload:
    any =
      await response.json();

  const text =
    payload
      ?.choices
      ?.[0]
      ?.message
      ?.content;

  if (
    typeof text !==
      "string" ||
    !text.trim()
  ) {
    throw new Error(
      "Groq Designer response was empty."
    );
  }

  return text;
}

async function generateWithGemini(
  prompt: string
): Promise<string> {
  if (
    !config.geminiApiKey
  ) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const client =
    new GoogleGenAI({
      apiKey:
        config.geminiApiKey
    });

  const response =
    await client.models.generateContent({
      model:
        config.geminiModel,

      contents:
        prompt,

      config: {
        responseMimeType:
          "application/json"
      }
    });

  if (
    !response.text
  ) {
    throw new Error(
      "Gemini Designer response was empty."
    );
  }

  return response.text;
}

function verifiedBusinessRecord(
  lead: Lead
): Record<
  string,
  unknown
> {
  return {
    businessName:
      lead.businessName,

    category:
      lead.category,

    market:
      lead.market,

    address:
      lead.address,

    phone:
      lead.phone,

    website:
      lead.website,

    contactEmail:
      lead.contactEmail,

    rating:
      lead.rating,

    ratingCount:
      lead.ratingCount,

    audit:
      lead.audit,

    score:
      lead.score
  };
}

function approvedDemoContent(
  assets: SalesAssets
): Record<
  string,
  unknown
> {
  return {
    businessSummary:
      assets.businessSummary,

    demoHeadline:
      assets.demoHeadline,

    demoSubheadline:
      assets.demoSubheadline,

    demoServices:
      assets.demoServices,

    recommendedPackage:
      assets.recommendedPackage
  };
}

function buildDesignerPrompt(
  contract: string,
  skill: string,
  lead: Lead,
  assets: SalesAssets
): string {
  const canonicalExample =
    deterministicWebsiteDesignSpec(
      lead,
      assets
    );

  return `
You are the TechTactics Web Designer.

You must follow the supplied Designer operating contract and
TechTactics UI Design skill.

This is a PRIVATE WEBSITE CONCEPT.
It is not the prospect's official website.

Return JSON only.

The response MUST match the WebsiteDesignSpec contract.

CANONICAL VALID WEBSITEDESIGNSPEC EXAMPLE
=========================================

The following JSON object already passes the application's
WebsiteDesignSpec validator.

Use exactly these key names and this nesting.

You MAY change allowed design choices or copy only when the change is
supported by VERIFIED BUSINESS RECORD or APPROVED DEMO CONTENT below.

If uncertain, return this canonical object exactly.

Do not add, rename, or omit required keys.

${JSON.stringify(
  canonicalExample,
  null,
  2
)}

STRICT JSON KEY RULES
=====================

Top-level keys ONLY:

- "skill"
- "mode"
- "designRead"
- "theme"
- "hero"
- "sections"
- "quality"

"designRead" keys ONLY:

- "audience"
- "tone"
- "density"
- "motion"

"theme" keys ONLY:

- "palette"
- "radius"
- "typography"

"hero" keys ONLY:

- "eyebrow" (optional)
- "headline"
- "subheadline"
- "primaryCta"
- "secondaryCta" (optional)

Each section object may contain ONLY:

- "type"
- "title"
- "body" (optional)
- "items" (optional)

"quality" keys ONLY:

- "semanticHeadings"
- "visibleFocus"
- "reducedMotion"
- "mobileFirst"

Every quality value MUST be the literal JSON boolean true.

Do not return false for any quality field.

Do not use null for optional fields.
Omit an optional field when it is not needed.

Do not wrap the JSON in Markdown fences.

Forbidden alias keys include:

- "content"
- "heading"
- "summary"
- "steps"
- "subtitle"
- "buttonLabel"
- "ctaText"
- "ctaLink"
- "primaryCtaText"
- "secondaryCtaText"
- "hierarchyVerified"
- "focalPointClear"
- "typographyConsistent"
- "spacingHarmonious"
- "alignmentClean"
- "contrastAccessible"
- "responsiveBehaviorIntentional"
- "mobileReadinessConfirmed"
- "focusStatesDefined"
- "accessibilityCompliant"
- "contentWrappingRealistic"
- "reducedMotionSupported"
- "emptyErrorLoadingStatesHandled"
- "consistencyMaintained"
- "purposeBuiltNotGeneric"

Never invent substitute property names.


Required top-level keys:

- skill
- mode
- designRead
- theme
- hero
- sections
- quality

The value of "skill" MUST be:

"techtactics-ui-design"

Allowed mode values:

- persuade
- operate
- read
- experience

Allowed density values:

- low
- moderate
- high

Allowed motion values:

- none
- restrained

Allowed palette values:

- professional-light
- professional-dark
- warm-local
- high-contrast

Allowed radius values:

- square
- soft
- rounded

Allowed typography values:

- system-modern
- system-editorial
- system-technical

Allowed section types:

- services
- about
- contact
- verified-trust
- process
- call-to-action

Every quality flag MUST be true.

Do not create or return:

- HTML
- CSS
- JavaScript
- scripts
- iframes
- arbitrary URLs
- remote resource URLs
- filesystem paths
- shell commands
- API endpoints
- credentials
- secrets
- executable code

Use only verified facts supplied below.

Never invent:

- services
- testimonials
- reviews
- review counts
- ratings
- certifications
- awards
- owners
- employees
- customer counts
- company history
- business metrics
- addresses
- websites
- contact information

When exact services are unknown, use generic wording based only on
the verified business category.

Prefer "persuade" for an ordinary local-business marketing website.

DESIGNER OPERATING CONTRACT
===========================

${contract}

TECHTACTICS UI DESIGN SKILL
===========================

${skill}

VERIFIED BUSINESS RECORD
========================

${JSON.stringify(
  verifiedBusinessRecord(
    lead
  ),
  null,
  2
)}

APPROVED DEMO CONTENT
=====================

${JSON.stringify(
  approvedDemoContent(
    assets
  ),
  null,
  2
)}
`;
}

function configuredPrimaryProvider():
"groq" | "gemini" {
  return (
    config.salesAiProvider ===
      "gemini"
      ? "gemini"
      : "groq"
  );
}

function providerOrder(
  primary:
    "groq"
    | "gemini",
  groqEnabled:
    boolean,
  geminiEnabled:
    boolean,
  groq:
    DesignerProvider,
  gemini:
    DesignerProvider
): Array<{
  name:
    "groq"
    | "gemini";

  run:
    DesignerProvider;
}> {
  const result:
    Array<{
      name:
        "groq"
        | "gemini";

      run:
        DesignerProvider;
    }> =
      [];

  function add(
    name:
      "groq"
      | "gemini"
  ): void {
    if (
      name === "groq" &&
      groqEnabled
    ) {
      result.push({
        name:
          "groq",

        run:
          groq
      });
    }

    if (
      name === "gemini" &&
      geminiEnabled
    ) {
      result.push({
        name:
          "gemini",

        run:
          gemini
      });
    }
  }

  add(
    primary
  );

  add(
    primary === "groq"
      ? "gemini"
      : "groq"
  );

  return result;
}

export async function generateWebsiteDesign(
  lead: Lead,
  assets: SalesAssets,
  options:
    DesignerGenerationOptions = {}
): Promise<WebsiteDesignSpec> {
  /*
   * Governance is loaded before any provider call.
   *
   * A missing contract or skill is therefore fatal and cannot
   * silently fall through to AI or deterministic generation.
   */
  const resources =
    await loadDesignerResources({
      rootDir:
        options.rootDir
    });

  const prompt =
    buildDesignerPrompt(
      resources.contract,
      resources.skill,
      lead,
      assets
    );

  const primary =
    options.primaryProvider ??
    configuredPrimaryProvider();

  const groqEnabled =
    options.groqEnabled ??
    Boolean(
      config.groqApiKey
    );

  const geminiEnabled =
    options.geminiEnabled ??
    Boolean(
      config.geminiApiKey
    );

  const groq =
    options.groq ??
    generateWithGroq;

  const gemini =
    options.gemini ??
    generateWithGemini;

  const providers =
    providerOrder(
      primary,
      groqEnabled,
      geminiEnabled,
      groq,
      gemini
    );

  for (
    const provider
    of providers
  ) {
    try {
      const text =
        await provider.run(
          prompt
        );

      const parsed =
        extractJson(
          text
        );

      return (
        parseWebsiteDesignSpec(
          parsed
        )
      );
    } catch (
      error
    ) {
      console.warn(
        `Designer ${provider.name} attempt failed; trying the next safe option:`,
        error instanceof Error
          ? error.message
          : "unknown error"
      );
    }
  }

  /*
   * AI failure is recoverable because governance was successfully
   * loaded above. The fallback is application-owned and validated.
   */
  return (
    parseWebsiteDesignSpec(
      deterministicWebsiteDesignSpec(
        lead,
        assets
      )
    )
  );
}
