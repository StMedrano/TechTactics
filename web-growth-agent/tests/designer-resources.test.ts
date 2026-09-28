import {
  mkdtemp,
  mkdir,
  writeFile,
  unlink
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  describe,
  expect,
  it
} from "vitest";
import {
  designerSkillAvailable,
  loadDesignerResources
} from "../src/designer-resources.js";

async function fixture(
  contract = "# Designer Agent",
  skill = "# TechTactics UI Design\n\ntechtactics-ui-design"
): Promise<string> {
  const root = await mkdtemp(
    path.join(
      os.tmpdir(),
      "wga-designer-resources-"
    )
  );

  await mkdir(
    path.join(root, "agents"),
    { recursive: true }
  );

  await mkdir(
    path.join(
      root,
      "company-os",
      "skills"
    ),
    { recursive: true }
  );

  await writeFile(
    path.join(
      root,
      "agents",
      "designer.md"
    ),
    contract,
    "utf8"
  );

  await writeFile(
    path.join(
      root,
      "company-os",
      "skills",
      "techtactics-ui-design.md"
    ),
    skill,
    "utf8"
  );

  return root;
}

describe("Designer runtime resources", () => {
  it("loads the Designer contract and mandatory UI skill", async () => {
    const rootDir = await fixture();

    const resources =
      await loadDesignerResources({
        rootDir
      });

    expect(resources.skillName).toBe(
      "techtactics-ui-design"
    );

    expect(resources.contract).toContain(
      "Designer Agent"
    );

    expect(resources.skill).toContain(
      "techtactics-ui-design"
    );

    expect(
      designerSkillAvailable({
        rootDir
      })
    ).toBe(true);
  });

  it("fails when the Designer contract is missing", async () => {
    const rootDir = await fixture();

    await unlink(
      path.join(
        rootDir,
        "agents",
        "designer.md"
      )
    );

    await expect(
      loadDesignerResources({
        rootDir
      })
    ).rejects.toThrow(
      /Designer runtime configuration error/
    );

    expect(
      designerSkillAvailable({
        rootDir
      })
    ).toBe(false);
  });

  it("fails when the UI skill is missing", async () => {
    const rootDir = await fixture();

    await unlink(
      path.join(
        rootDir,
        "company-os",
        "skills",
        "techtactics-ui-design.md"
      )
    );

    await expect(
      loadDesignerResources({
        rootDir
      })
    ).rejects.toThrow(
      /Designer runtime configuration error/
    );

    expect(
      designerSkillAvailable({
        rootDir
      })
    ).toBe(false);
  });

  it("rejects an empty Designer contract", async () => {
    const rootDir = await fixture(
      "   ",
      "# techtactics-ui-design"
    );

    await expect(
      loadDesignerResources({
        rootDir
      })
    ).rejects.toThrow(
      /Designer contract is empty/
    );
  });

  it("rejects an empty UI skill", async () => {
    const rootDir = await fixture(
      "# Designer",
      "   "
    );

    await expect(
      loadDesignerResources({
        rootDir
      })
    ).rejects.toThrow(
      /TechTactics UI Design skill is empty/
    );
  });
});
