import {
  existsSync,
  readFileSync
} from "node:fs";
import {
  readFile
} from "node:fs/promises";
import path from "node:path";

export interface DesignerResources {
  contract: string;
  skill: string;
  skillName: "techtactics-ui-design";
}

function resourcePaths(
  rootDir: string
): {
  contract: string;
  skill: string;
} {
  return {
    contract: path.join(
      rootDir,
      "agents",
      "designer.md"
    ),

    skill: path.join(
      rootDir,
      "company-os",
      "skills",
      "techtactics-ui-design.md"
    )
  };
}

function requireContent(
  content: string,
  label: string
): string {
  if (!content.trim()) {
    throw new Error(
      `Designer runtime configuration error: ${label} is empty.`
    );
  }

  return content;
}

export async function loadDesignerResources(
  options: {
    rootDir?: string;
  } = {}
): Promise<DesignerResources> {
  const rootDir =
    options.rootDir ??
    process.cwd();

  const paths =
    resourcePaths(rootDir);

  let contract: string;
  let skill: string;

  try {
    [contract, skill] =
      await Promise.all([
        readFile(
          paths.contract,
          "utf8"
        ),

        readFile(
          paths.skill,
          "utf8"
        )
      ]);
  } catch {
    throw new Error(
      "Designer runtime configuration error: required Designer resources are unavailable."
    );
  }

  return {
    contract:
      requireContent(
        contract,
        "Designer contract"
      ),

    skill:
      requireContent(
        skill,
        "TechTactics UI Design skill"
      ),

    skillName:
      "techtactics-ui-design"
  };
}

export function designerSkillAvailable(
  options: {
    rootDir?: string;
  } = {}
): boolean {
  const rootDir =
    options.rootDir ??
    process.cwd();

  const paths =
    resourcePaths(rootDir);

  try {
    if (
      !existsSync(
        paths.contract
      ) ||
      !existsSync(
        paths.skill
      )
    ) {
      return false;
    }

    const contract =
      readFileSync(
        paths.contract,
        "utf8"
      ).trim();

    const skill =
      readFileSync(
        paths.skill,
        "utf8"
      ).trim();

    return Boolean(
      contract &&
      skill
    );
  } catch {
    return false;
  }
}
