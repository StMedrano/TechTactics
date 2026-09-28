import {
  describe,
  expect,
  it
} from "vitest";

import {
  deterministicWebsiteDesignSpec,
  parseWebsiteDesignSpec
} from "../src/design-spec.js";

import type {
  Lead,
  SalesAssets
} from "../src/types.js";

const lead: Lead = {
  id: "lead_design_spec",
  source: "fixture",
  businessName: "Design Spec Company",
  category: "Plumber",
  phone: "555-555-0100",
  discoveredAt: "2026-09-28T00:00:00.000Z",
  updatedAt: "2026-09-28T00:00:00.000Z",
  stage: "qualified",
  approvedForOutreach: false,
  notes: []
};

const assets: SalesAssets = {
  generatedAt: "2026-09-28T00:00:00.000Z",
  businessSummary: "Verified summary",
  outreachDraft: "Verified outreach",
  proposalMarkdown: "# Proposal",
  demoHeadline: "Clear local plumbing service",
  demoSubheadline: "A modern private website concept.",
  demoServices: [
    "Plumbing services",
    "Customer contact",
    "Mobile experience"
  ],
  recommendedPackage: "Launch"
};

function validDesign() {
  return {
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
      eyebrow: "Plumber",
      headline: "Clear local plumbing service",
      subheadline: "A modern private website concept.",
      primaryCta: "Call Now",
      secondaryCta: "View Services"
    },

    sections: [
      {
        type: "services",
        title: "Services",
        items: [
          "Plumbing services",
          "Customer contact",
          "Mobile experience"
        ]
      },
      {
        type: "about",
        title: "About Design Spec Company",
        body: "A private concept based on verified business information."
      },
      {
        type: "contact",
        title: "Contact",
        body: "Make the next customer step clear."
      }
    ],

    quality: {
      semanticHeadings: true,
      visibleFocus: true,
      reducedMotion: true,
      mobileFirst: true
    }
  };
}

describe("WebsiteDesignSpec security boundary", () => {
  it("accepts a valid allow-listed design", () => {
    const result =
      parseWebsiteDesignSpec(
        validDesign()
      );

    expect(result.skill).toBe(
      "techtactics-ui-design"
    );

    expect(result.mode).toBe(
      "persuade"
    );
  });

  it("provides a deterministic safe fallback", () => {
    const result =
      deterministicWebsiteDesignSpec(
        lead,
        assets
      );

    expect(result.skill).toBe(
      "techtactics-ui-design"
    );

    expect(result.mode).toBe(
      "persuade"
    );

    expect(
      result.quality.visibleFocus
    ).toBe(true);

    expect(
      result.quality.reducedMotion
    ).toBe(true);
  });

  it("rejects arbitrary top-level HTML", () => {
    const value: any =
      validDesign();

    value.html =
      "<script>alert(1)</script>";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects arbitrary top-level CSS", () => {
    const value: any =
      validDesign();

    value.css =
      "body{display:none}";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects arbitrary JavaScript fields", () => {
    const value: any =
      validDesign();

    value.javascript =
      "fetch('https://evil.example')";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects arbitrary generated URLs", () => {
    const value: any =
      validDesign();

    value.hero.url =
      "https://evil.example";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects unknown palettes", () => {
    const value: any =
      validDesign();

    value.theme.palette =
      "ai-purple-mesh";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects unknown typography", () => {
    const value: any =
      validDesign();

    value.theme.typography =
      "remote-google-font";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects unknown section types", () => {
    const value: any =
      validDesign();

    value.sections[0].type =
      "execute-script";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects unknown section properties", () => {
    const value: any =
      validDesign();

    value.sections[0].html =
      "<iframe></iframe>";

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("requires semantic headings", () => {
    const value: any =
      validDesign();

    value.quality.semanticHeadings =
      false;

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("requires visible focus", () => {
    const value: any =
      validDesign();

    value.quality.visibleFocus =
      false;

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("requires reduced-motion support", () => {
    const value: any =
      validDesign();

    value.quality.reducedMotion =
      false;

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("requires mobile-first behavior", () => {
    const value: any =
      validDesign();

    value.quality.mobileFirst =
      false;

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects excessive section counts", () => {
    const value: any =
      validDesign();

    value.sections = Array.from(
      { length: 10 },
      (_, index) => ({
        type: "about",
        title: `Section ${index}`,
        body: "Content"
      })
    );

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });

  it("rejects excessive content length", () => {
    const value: any =
      validDesign();

    value.hero.headline =
      "x".repeat(500);

    expect(() =>
      parseWebsiteDesignSpec(
        value
      )
    ).toThrow();
  });
});
