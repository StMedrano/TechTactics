import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function text(file: string): Promise<string> {
  return readFile(file, "utf8");
}

describe("Designer UI skill documentation", () => {
  it("provides the mandatory TechTactics UI Design skill", async () => {
    const skill = await text(
      "company-os/skills/techtactics-ui-design.md"
    );

    expect(skill).toContain("techtactics-ui-design");
    expect(skill).toContain("Persuade");
    expect(skill).toContain("Operate");
    expect(skill).toContain("Read");
    expect(skill).toContain("Experience");
    expect(skill).toMatch(/WCAG 2\.2 AA/i);
    expect(skill).toMatch(/visible focus/i);
    expect(skill).toMatch(/reduced.motion/i);
    expect(skill).toMatch(/responsive/i);
  });

  it("prohibits fabricated business information", async () => {
    const skill = await text(
      "company-os/skills/techtactics-ui-design.md"
    );

    expect(skill).toMatch(/fabricat|invent/i);
    expect(skill).toMatch(/testimonial/i);
    expect(skill).toMatch(/award/i);
    expect(skill).toMatch(/certification/i);
    expect(skill).toMatch(/logo/i);
    expect(skill).toMatch(/services/i);
  });

  it("requires the skill in the Designer contract", async () => {
    const designer = await text("agents/designer.md");

    expect(designer).toContain(
      "company-os/skills/techtactics-ui-design.md"
    );

    expect(designer).toMatch(/mandatory|required/i);
  });

  it("registers the skill as durable Company OS knowledge", async () => {
    const skills = await text("company-os/SKILLS.md");
    const decisions = await text("company-os/DECISIONS.md");

    expect(skills).toContain("techtactics-ui-design");
    expect(skills).toContain("Designer");

    expect(decisions).toContain("techtactics-ui-design");
    expect(decisions).toMatch(/Designer-generated/i);
  });
});
