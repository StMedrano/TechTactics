import { z } from "zod";

import type {
  Lead,
  SalesAssets
} from "./types.js";

export const DesignSurfaceModeSchema =
  z.enum([
    "persuade",
    "operate",
    "read",
    "experience"
  ]);

export const DesignPaletteSchema =
  z.enum([
    "professional-light",
    "professional-dark",
    "warm-local",
    "high-contrast"
  ]);

export const DesignRadiusSchema =
  z.enum([
    "square",
    "soft",
    "rounded"
  ]);

export const DesignTypographySchema =
  z.enum([
    "system-modern",
    "system-editorial",
    "system-technical"
  ]);

export const WebsiteDesignSectionTypeSchema =
  z.enum([
    "services",
    "about",
    "contact",
    "verified-trust",
    "process",
    "call-to-action"
  ]);

export const WebsiteDesignSectionSchema =
  z
    .object({
      type:
        WebsiteDesignSectionTypeSchema,

      title:
        z
          .string()
          .min(1)
          .max(120),

      body:
        z
          .string()
          .min(1)
          .max(800)
          .optional(),

      items:
        z
          .array(
            z
              .string()
              .min(1)
              .max(160)
          )
          .max(6)
          .optional()
    })
    .strict();

export const WebsiteDesignSpecSchema =
  z
    .object({
      skill:
        z.literal(
          "techtactics-ui-design"
        ),

      mode:
        DesignSurfaceModeSchema,

      designRead:
        z
          .object({
            audience:
              z
                .string()
                .min(1)
                .max(160),

            tone:
              z
                .string()
                .min(1)
                .max(160),

            density:
              z.enum([
                "low",
                "moderate",
                "high"
              ]),

            motion:
              z.enum([
                "none",
                "restrained"
              ])
          })
          .strict(),

      theme:
        z
          .object({
            palette:
              DesignPaletteSchema,

            radius:
              DesignRadiusSchema,

            typography:
              DesignTypographySchema
          })
          .strict(),

      hero:
        z
          .object({
            eyebrow:
              z
                .string()
                .max(100)
                .optional(),

            headline:
              z
                .string()
                .min(1)
                .max(160),

            subheadline:
              z
                .string()
                .min(1)
                .max(320),

            primaryCta:
              z
                .string()
                .min(1)
                .max(80),

            secondaryCta:
              z
                .string()
                .min(1)
                .max(80)
                .optional()
          })
          .strict(),

      sections:
        z
          .array(
            WebsiteDesignSectionSchema
          )
          .min(2)
          .max(6),

      quality:
        z
          .object({
            semanticHeadings:
              z.literal(true),

            visibleFocus:
              z.literal(true),

            reducedMotion:
              z.literal(true),

            mobileFirst:
              z.literal(true)
          })
          .strict()
    })
    .strict();

export type DesignSurfaceMode =
  z.infer<
    typeof DesignSurfaceModeSchema
  >;

export type DesignPalette =
  z.infer<
    typeof DesignPaletteSchema
  >;

export type DesignRadius =
  z.infer<
    typeof DesignRadiusSchema
  >;

export type DesignTypography =
  z.infer<
    typeof DesignTypographySchema
  >;

export type WebsiteDesignSectionType =
  z.infer<
    typeof WebsiteDesignSectionTypeSchema
  >;

export type WebsiteDesignSection =
  z.infer<
    typeof WebsiteDesignSectionSchema
  >;

export type WebsiteDesignSpec =
  z.infer<
    typeof WebsiteDesignSpecSchema
  >;

export function parseWebsiteDesignSpec(
  value: unknown
): WebsiteDesignSpec {
  return WebsiteDesignSpecSchema.parse(
    value
  );
}

export function deterministicWebsiteDesignSpec(
  lead: Lead,
  assets: SalesAssets
): WebsiteDesignSpec {
  const category =
    lead.category?.trim() ||
    "Local business";

  const primaryCta =
    lead.phone
      ? "Call Now"
      : lead.contactEmail
        ? "Contact Us"
        : "Request Information";

  const safeServices =
    assets.demoServices
      .filter(
        service =>
          Boolean(
            service.trim()
          )
      )
      .slice(
        0,
        6
      );

  return {
    skill:
      "techtactics-ui-design",

    mode:
      "persuade",

    designRead: {
      audience:
        "Local customers evaluating the business",

      tone:
        "Professional, clear, trustworthy, and service oriented",

      density:
        "moderate",

      motion:
        "restrained"
    },

    theme: {
      palette:
        "professional-light",

      radius:
        "soft",

      typography:
        "system-modern"
    },

    hero: {
      eyebrow:
        category,

      headline:
        assets.demoHeadline,

      subheadline:
        assets.demoSubheadline,

      primaryCta,

      secondaryCta:
        "View Services"
    },

    sections: [
      {
        type:
          "services",

        title:
          "Services",

        items:
          safeServices.length
            ? safeServices
            : [
                `${category} information`
              ]
      },

      {
        type:
          "about",

        title:
          `About ${lead.businessName}`,

        body:
          "This private concept demonstrates a clearer presentation of verified business information. Final client copy requires confirmation before publication."
      },

      {
        type:
          "contact",

        title:
          "Make the next step clear",

        body:
          "A production website can give customers a simple path to contact the business using verified contact information."
      }
    ],

    quality: {
      semanticHeadings:
        true,

      visibleFocus:
        true,

      reducedMotion:
        true,

      mobileFirst:
        true
    }
  };
}
