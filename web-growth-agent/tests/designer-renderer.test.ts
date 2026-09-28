import {
  describe,
  expect,
  it
} from "vitest";

import {
  deterministicWebsiteDesignSpec,
  type WebsiteDesignSpec
} from "../src/design-spec.js";

import {
  renderWebsitePreview
} from "../src/designer-renderer.js";

import type {
  Lead,
  SalesAssets
} from "../src/types.js";

const lead: Lead = {
  id: "lead_renderer",
  source: "fixture",
  businessName: "Renderer <Test> & Company",
  category: "Contractor",
  market: "Baton Rouge LA",
  address: "123 Test Street",
  phone: "555-555-1212",
  contactEmail: "hello@example.com",
  rating: 4.8,
  ratingCount: 42,
  discoveredAt: "2026-09-28T00:00:00.000Z",
  updatedAt: "2026-09-28T00:00:00.000Z",
  stage: "qualified",
  approvedForOutreach: false,
  notes: []
};

const assets: SalesAssets = {
  generatedAt: "2026-09-28T00:00:00.000Z",
  businessSummary:
    "Verified summary <script>alert('summary')</script>",

  outreachDraft:
    "Outreach",

  proposalMarkdown:
    "# Proposal",

  demoHeadline:
    "Headline <script>alert('headline')</script>",

  demoSubheadline:
    "A safe private website concept.",

  demoServices: [
    "Service <script>alert('service')</script>",
    "Customer contact",
    "Mobile experience"
  ],

  recommendedPackage:
    "Launch"
};

function design():
WebsiteDesignSpec {
  return deterministicWebsiteDesignSpec(
    lead,
    assets
  );
}

describe(
  "safe Designer website renderer",
  () => {
    it(
      "renders a complete static HTML document",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toContain(
          "<!doctype html>"
        );

        expect(html).toContain(
          "<main>"
        );

        expect(html).toContain(
          "</html>"
        );
      }
    );

    it(
      "includes private concept and robots protection",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toContain(
          'content="noindex,nofollow"'
        );

        expect(html).toContain(
          "Private concept preview created by TechTactics"
        );

        expect(html).toContain(
          "this is not an official"
        );
      }
    );

    it(
      "escapes generated and business text",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).not.toContain(
          "<script>"
        );

        expect(html).toContain(
          "Renderer &lt;Test&gt; &amp; Company"
        );

        expect(html).toContain(
          "&lt;script&gt;"
        );
      }
    );

    it(
      "contains no JavaScript or executable script tag",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(
          /<script\b/i.test(html)
        ).toBe(false);

        expect(
          /javascript:/i.test(html)
        ).toBe(false);
      }
    );

    it(
      "includes visible keyboard focus treatment",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toContain(
          ":focus-visible"
        );
      }
    );

    it(
      "includes reduced-motion support",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toContain(
          "prefers-reduced-motion"
        );
      }
    );

    it(
      "includes a mobile responsive breakpoint",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toMatch(
          /@media\s*\(max-width:\s*760px\)/
        );
      }
    );

    it(
      "uses only verified contact values in contact links",
      () => {
        const html =
          renderWebsitePreview(
            lead,
            assets,
            design()
          );

        expect(html).toContain(
          'href="tel:555-555-1212"'
        );

        expect(html).toContain(
          'href="mailto:hello@example.com"'
        );
      }
    );

    it(
      "renders verified trust from lead facts only",
      () => {
        const value =
          design();

        value.sections.push({
          type: "verified-trust",
          title: "Verified information",
          body:
            "FABRICATED TRUST CLAIM"
        });

        const html =
          renderWebsitePreview(
            lead,
            assets,
            value
          );

        expect(html).toContain(
          "4.8"
        );

        expect(html).toContain(
          "42"
        );

        expect(html).toContain(
          "123 Test Street"
        );

        expect(html).not.toContain(
          "FABRICATED TRUST CLAIM"
        );
      }
    );

    it(
      "supports every allow-listed palette without remote assets",
      () => {
        const palettes =
          [
            "professional-light",
            "professional-dark",
            "warm-local",
            "high-contrast"
          ] as const;

        for (
          const palette
          of palettes
        ) {
          const value =
            design();

          value.theme.palette =
            palette;

          const html =
            renderWebsitePreview(
              lead,
              assets,
              value
            );

          expect(html).toContain(
            "<style>"
          );

          expect(html).not.toMatch(
            /@import\s+url/i
          );

          expect(html).not.toMatch(
            /https?:\/\/fonts\./i
          );
        }
      }
    );

    it(
      "supports every allow-listed radius",
      () => {
        const values =
          [
            "square",
            "soft",
            "rounded"
          ] as const;

        for (
          const radius
          of values
        ) {
          const value =
            design();

          value.theme.radius =
            radius;

          const html =
            renderWebsitePreview(
              lead,
              assets,
              value
            );

          expect(html).toContain(
            "--radius:"
          );
        }
      }
    );

    it(
      "supports every allow-listed typography mode without remote fonts",
      () => {
        const values =
          [
            "system-modern",
            "system-editorial",
            "system-technical"
          ] as const;

        for (
          const typography
          of values
        ) {
          const value =
            design();

          value.theme.typography =
            typography;

          const html =
            renderWebsitePreview(
              lead,
              assets,
              value
            );

          expect(html).not.toContain(
            "fonts.googleapis.com"
          );

          expect(html).not.toContain(
            "fonts.gstatic.com"
          );
        }
      }
    );

    it(
      "renders all approved section types without arbitrary code",
      () => {
        const value =
          design();

        value.sections = [
          {
            type: "services",
            title: "Services",
            items: [
              "Service One",
              "Service Two"
            ]
          },
          {
            type: "about",
            title: "About",
            body: "About copy"
          },
          {
            type: "process",
            title: "Process",
            items: [
              "Discover",
              "Plan",
              "Deliver"
            ]
          },
          {
            type: "verified-trust",
            title: "Verified Trust"
          },
          {
            type: "call-to-action",
            title: "Ready to talk?",
            body: "Contact the business."
          },
          {
            type: "contact",
            title: "Contact",
            body: "Get in touch."
          }
        ];

        const html =
          renderWebsitePreview(
            lead,
            assets,
            value
          );

        expect(html).toContain(
          "Services"
        );

        expect(html).toContain(
          "About"
        );

        expect(html).toContain(
          "Process"
        );

        expect(html).toContain(
          "Verified business information"
        );

        expect(html).toContain(
          "Ready to talk?"
        );

        expect(html).toContain(
          "Contact"
        );

        expect(
          /<script\b/i.test(html)
        ).toBe(false);
      }
    );
  }
);
