import {
  access,
  cp,
  mkdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import {
  config
} from "./config.js";

import {
  deterministicWebsiteDesignSpec,
  type WebsiteDesignSpec
} from "./design-spec.js";

import {
  renderWebsitePreview
} from "./designer-renderer.js";

import type {
  Lead,
  LeadPreviewState,
  SalesAssets
} from "./types.js";

export interface LeadArtifactTransaction {
  demoPath: string;
  directory: string;
  preview: LeadPreviewState;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

async function pathExists(
  value: string
): Promise<boolean> {
  try {
    await access(value);
    return true;
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

function generatedPreviewState(
  lead: Lead,
  assets: SalesAssets,
  design: WebsiteDesignSpec
): LeadPreviewState {
  const designMetadata = {
    designSkill:
      "techtactics-ui-design" as const,

    designMode:
      design.mode,

    designEngine:
      "designer-agent" as const
  };

  if (
    lead.preview?.source ===
    "uploaded"
  ) {
    return {
      ...lead.preview,

      source:
        "uploaded",

      entrypoint:
        "index.html",

      previewUrlPath:
        `/preview/${lead.id}/`,

      generatedAt:
        assets.generatedAt,

      ...designMetadata
    };
  }

  return {
    source:
      "generated",

    updatedAt:
      assets.generatedAt,

    entrypoint:
      "index.html",

    previewUrlPath:
      `/preview/${lead.id}/`,

    generatedAt:
      assets.generatedAt,

    ...designMetadata
  };
}

export async function prepareLeadArtifacts(
  lead: Lead,
  assets: SalesAssets,
  design: WebsiteDesignSpec
): Promise<LeadArtifactTransaction> {
  const directory =
    path.join(
      config.artifactDir,
      lead.id
    );

  const suffix =
    `${process.pid}-${Date.now()}`;

  const stagingDirectory =
    path.join(
      config.artifactDir,
      `.${lead.id}-generation-staging-${suffix}`
    );

  const backupDirectory =
    path.join(
      config.artifactDir,
      `.${lead.id}-generation-backup-${suffix}`
    );

  await mkdir(
    config.artifactDir,
    {
      recursive: true
    }
  );

  const hadPrevious =
    await pathExists(
      directory
    );

  try {
    if (
      hadPrevious
    ) {
      await cp(
        directory,
        stagingDirectory,
        {
          recursive: true
        }
      );
    } else {
      await mkdir(
        stagingDirectory,
        {
          recursive: true
        }
      );
    }

    const generatedDirectory =
      path.join(
        stagingDirectory,
        "demo-generated"
      );

    const demoDirectory =
      path.join(
        stagingDirectory,
        "demo"
      );

    await rm(
      generatedDirectory,
      {
        recursive: true,
        force: true
      }
    );

    await mkdir(
      generatedDirectory,
      {
        recursive: true
      }
    );

    await writeFile(
      path.join(
        generatedDirectory,
        "index.html"
      ),
      renderWebsitePreview(
        lead,
        assets,
        design
      ),
      "utf8"
    );

    const preview =
      generatedPreviewState(
        lead,
        assets,
        design
      );

    /*
     * If a user-uploaded preview is active, the staging copy already
     * contains the current demo/ directory and it is intentionally
     * left untouched.
     */
    if (
      preview.source ===
      "generated"
    ) {
      await rm(
        demoDirectory,
        {
          recursive: true,
          force: true
        }
      );

      await cp(
        generatedDirectory,
        demoDirectory,
        {
          recursive: true
        }
      );
    }

    await Promise.all([
      writeFile(
        path.join(
          stagingDirectory,
          "proposal.md"
        ),
        assets.proposalMarkdown,
        "utf8"
      ),

      writeFile(
        path.join(
          stagingDirectory,
          "outreach-draft.txt"
        ),
        assets.outreachDraft +
          "\n",
        "utf8"
      ),

      writeFile(
        path.join(
          stagingDirectory,
          "business-summary.txt"
        ),
        assets.businessSummary +
          "\n",
        "utf8"
      ),

      writeFile(
        path.join(
          stagingDirectory,
          "preview-metadata.json"
        ),
        JSON.stringify(
          preview,
          null,
          2
        ) + "\n",
        "utf8"
      )
    ]);

    if (
      hadPrevious
    ) {
      await rename(
        directory,
        backupDirectory
      );
    }

    try {
      await rename(
        stagingDirectory,
        directory
      );
    } catch (
      error
    ) {
      if (
        hadPrevious &&
        await pathExists(
          backupDirectory
        )
      ) {
        await rename(
          backupDirectory,
          directory
        );
      }

      throw error;
    }

    let finalized =
      false;

    return {
      demoPath:
        path.join(
          directory,
          "demo",
          "index.html"
        ),

      directory,

      preview,

      rollback:
        async () => {
          if (
            finalized
          ) {
            return;
          }

          await rm(
            directory,
            {
              recursive: true,
              force: true
            }
          );

          if (
            hadPrevious &&
            await pathExists(
              backupDirectory
            )
          ) {
            await rename(
              backupDirectory,
              directory
            );
          }

          finalized =
            true;
        },

      commit:
        async () => {
          if (
            finalized
          ) {
            return;
          }

          if (
            hadPrevious
          ) {
            await rm(
              backupDirectory,
              {
                recursive: true,
                force: true
              }
            );
          }

          finalized =
            true;
        }
    };
  } catch (
    error
  ) {
    await rm(
      stagingDirectory,
      {
        recursive: true,
        force: true
      }
    );

    if (
      hadPrevious &&
      await pathExists(
        backupDirectory
      ) &&
      !await pathExists(
        directory
      )
    ) {
      await rename(
        backupDirectory,
        directory
      );
    }

    throw error;
  }
}

/*
 * Backwards-compatible committed artifact writer for focused artifact
 * tests and non-transactional callers.
 *
 * The production generation pipeline uses prepareLeadArtifacts()
 * directly so persistence failures can roll the filesystem back.
 */
export async function writeLeadArtifacts(
  lead: Lead,
  assets: SalesAssets,
  design:
    WebsiteDesignSpec =
      deterministicWebsiteDesignSpec(
        lead,
        assets
      )
): Promise<{
  demoPath: string;
  directory: string;
  preview: LeadPreviewState;
}> {
  const transaction =
    await prepareLeadArtifacts(
      lead,
      assets,
      design
    );

  await transaction.commit();

  return {
    demoPath:
      transaction.demoPath,

    directory:
      transaction.directory,

    preview:
      transaction.preview
  };
}
