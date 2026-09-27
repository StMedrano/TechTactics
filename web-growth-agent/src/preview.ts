import {
  createWriteStream
} from "node:fs";
import {
  cp as cpAsync,
  mkdir as mkdirAsync,
  readFile as readFileAsync,
  readdir as readdirAsync,
  rename as renameAsync,
  rm as rmAsync,
  writeFile as writeFileAsync
} from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

import { config } from "./config.js";
import type {
  Lead,
  LeadPreviewState
} from "./types.js";

const MAX_PREVIEW_FILES = 500;
const MAX_PREVIEW_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PREVIEW_TOTAL_BYTES = 100 * 1024 * 1024;

export interface PreviewSwapTransaction {
  preview: LeadPreviewState;
  demoPath: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface PreviewUploadInput {
  buffer: Buffer;
  originalName: string;
}

function safeEntryPath(fileName: string): string {
  const normalized = fileName.replaceAll("\\", "/");

  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error("Unsafe absolute path in preview ZIP.");
  }

  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) =>
        segment === ".." ||
        segment === ""
    )
  ) {
    throw new Error("Unsafe traversal path in preview ZIP.");
  }

  return segments
    .filter((segment) => segment !== ".")
    .join("/");
}

function archiveEntryType(entry: yauzl.Entry): "file" | "directory" {
  const normalized = entry.fileName.replaceAll("\\", "/");

  if (normalized.endsWith("/")) {
    return "directory";
  }

  const unixMode =
    (entry.externalFileAttributes >>> 16) & 0xffff;

  const type = unixMode & 0o170000;

  if (
    type !== 0 &&
    type !== 0o100000
  ) {
    throw new Error(
      "Unsupported link or archive entry type."
    );
  }

  return "file";
}

function openZip(buffer: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      {
        lazyEntries: true,
        decodeStrings: true
      },
      (error, zip) => {
        if (error || !zip) {
          reject(
            error ??
              new Error("Unable to open preview ZIP.")
          );
          return;
        }

        resolve(zip);
      }
    );
  });
}

async function extractZip(
  buffer: Buffer,
  destination: string
): Promise<void> {
  const zip = await openZip(buffer);

  let fileCount = 0;
  let totalExtractedBytes = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    function fail(error: unknown) {
      if (settled) return;
      settled = true;

      try {
        zip.close();
      } catch {
        // Ignore close failures while reporting original error.
      }

      reject(error);
    }

    zip.on("error", fail);

    zip.on("end", () => {
      if (settled) return;
      settled = true;
      resolve();
    });

    zip.on("entry", async (entry) => {
      try {
        const relative = safeEntryPath(
          entry.fileName
        );

        const entryType =
          archiveEntryType(entry);

        const target = path.resolve(
          destination,
          relative
        );

        const root =
          path.resolve(destination) +
          path.sep;

        if (
          target !== path.resolve(destination) &&
          !target.startsWith(root)
        ) {
          throw new Error(
            "Unsafe traversal path in preview ZIP."
          );
        }

        if (entryType === "directory") {
          await mkdirAsync(target, {
            recursive: true
          });

          zip.readEntry();
          return;
        }

        fileCount += 1;

        if (fileCount > MAX_PREVIEW_FILES) {
          throw new Error(
            `Preview ZIP exceeds the ${MAX_PREVIEW_FILES} file limit.`
          );
        }

        await mkdirAsync(
          path.dirname(target),
          {
            recursive: true
          }
        );

        zip.openReadStream(
          entry,
          async (error, stream) => {
            if (error || !stream) {
              fail(
                error ??
                  new Error(
                    "Unable to read preview ZIP entry."
                  )
              );
              return;
            }

            try {
              let fileBytes = 0;

              const byteCounter = new Transform({
                transform(chunk, _encoding, callback) {
                  const bytes = Buffer.isBuffer(chunk)
                    ? chunk.length
                    : Buffer.byteLength(chunk);

                  fileBytes += bytes;
                  totalExtractedBytes += bytes;

                  if (fileBytes > MAX_PREVIEW_FILE_BYTES) {
                    callback(
                      new Error(
                        "Preview file exceeds the 20 MB extracted size limit."
                      )
                    );
                    return;
                  }

                  if (totalExtractedBytes > MAX_PREVIEW_TOTAL_BYTES) {
                    callback(
                      new Error(
                        "Preview ZIP exceeds the 100 MB total extracted size limit."
                      )
                    );
                    return;
                  }

                  callback(null, chunk);
                }
              });

              await pipeline(
                stream,
                byteCounter,
                createWriteStream(target, {
                  flags: "wx"
                })
              );

              zip.readEntry();
            } catch (streamError) {
              fail(streamError);
            }
          }
        );
      } catch (error) {
        fail(error);
      }
    });

    zip.readEntry();
  });
}

async function normalizeExtractedRoot(
  extractionDirectory: string
): Promise<string> {
  const rootIndex = path.join(
    extractionDirectory,
    "index.html"
  );

  try {
    await readFileAsync(rootIndex);
    return extractionDirectory;
  } catch {
    // Check for exactly one enclosing directory.
  }

  const entries = await readdirAsync(
    extractionDirectory,
    {
      withFileTypes: true
    }
  );

  if (
    entries.length !== 1 ||
    !entries[0]?.isDirectory()
  ) {
    throw new Error(
      "Preview ZIP must contain index.html at its root."
    );
  }

  const nestedRoot = path.join(
    extractionDirectory,
    entries[0].name
  );

  try {
    await readFileAsync(
      path.join(
        nestedRoot,
        "index.html"
      )
    );
  } catch {
    throw new Error(
      "Preview ZIP must contain index.html at its root."
    );
  }

  return nestedRoot;
}

async function readOptionalFile(
  filePath: string
): Promise<string | undefined> {
  try {
    return await readFileAsync(
      filePath,
      "utf8"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }

    throw error;
  }
}

async function moveExistingAside(
  target: string,
  rollback: string
): Promise<boolean> {
  try {
    await renameAsync(
      target,
      rollback
    );
    return true;
  } catch (error) {
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

function uploadedPreviewState(
  lead: Lead,
  originalName: string
): LeadPreviewState {
  const now =
    new Date().toISOString();

  return {
    source: "uploaded",
    updatedAt: now,
    entrypoint: "index.html",
    previewUrlPath:
      `/preview/${lead.id}/`,
    uploadedFileName: originalName,
    generatedAt:
      lead.preview?.generatedAt
  };
}

function restoredPreviewState(
  lead: Lead
): LeadPreviewState {
  const now =
    new Date().toISOString();

  return {
    source: "generated",
    updatedAt: now,
    entrypoint: "index.html",
    previewUrlPath:
      `/preview/${lead.id}/`,
    generatedAt:
      lead.preview?.generatedAt
  };
}

async function prepareSwap(
  lead: Lead,
  preparedDirectory: string,
  preview: LeadPreviewState,
  artifactDir: string
): Promise<PreviewSwapTransaction> {
  const leadDirectory =
    path.join(
      artifactDir,
      lead.id
    );

  const demoDirectory =
    path.join(
      leadDirectory,
      "demo"
    );

  const metadataPath =
    path.join(
      leadDirectory,
      "preview-metadata.json"
    );

  const suffix =
    `${process.pid}-${Date.now()}`;

  const rollbackDirectory =
    path.join(
      leadDirectory,
      `.demo-rollback-${suffix}`
    );

  const oldMetadata =
    await readOptionalFile(metadataPath);

  const hadDemo =
    await moveExistingAside(
      demoDirectory,
      rollbackDirectory
    );

  try {
    await renameAsync(
      preparedDirectory,
      demoDirectory
    );

    await writeFileAsync(
      metadataPath,
      JSON.stringify(
        preview,
        null,
        2
      ) + "\n",
      "utf8"
    );
  } catch (error) {
    await rmAsync(
      demoDirectory,
      {
        recursive: true,
        force: true
      }
    );

    if (hadDemo) {
      await renameAsync(
        rollbackDirectory,
        demoDirectory
      );
    }

    if (oldMetadata === undefined) {
      await rmAsync(
        metadataPath,
        {
          force: true
        }
      );
    } else {
      await writeFileAsync(
        metadataPath,
        oldMetadata,
        "utf8"
      );
    }

    throw error;
  }

  let finished = false;

  return {
    preview,
    demoPath:
      path.join(
        demoDirectory,
        "index.html"
      ),

    async commit() {
      if (finished) return;
      finished = true;

      await rmAsync(
        rollbackDirectory,
        {
          recursive: true,
          force: true
        }
      );
    },

    async rollback() {
      if (finished) return;
      finished = true;

      await rmAsync(
        demoDirectory,
        {
          recursive: true,
          force: true
        }
      );

      if (hadDemo) {
        await renameAsync(
          rollbackDirectory,
          demoDirectory
        );
      }

      if (oldMetadata === undefined) {
        await rmAsync(
          metadataPath,
          {
            force: true
          }
        );
      } else {
        await writeFileAsync(
          metadataPath,
          oldMetadata,
          "utf8"
        );
      }
    }
  };
}

export async function prepareUploadedPreview(
  lead: Lead,
  input: PreviewUploadInput,
  artifactDir = config.artifactDir
): Promise<PreviewSwapTransaction> {
  if (input.buffer.length > config.maxPreviewUploadBytes) {
    throw new Error(
      `Preview upload exceeds the configured compressed upload size limit of ${Math.floor(
        config.maxPreviewUploadBytes / 1024 / 1024
      )} MB.`
    );
  }

  const leadDirectory =
    path.join(
      artifactDir,
      lead.id
    );

  await mkdirAsync(
    leadDirectory,
    {
      recursive: true
    }
  );

  const suffix =
    `${process.pid}-${Date.now()}`;

  const extractionDirectory =
    path.join(
      leadDirectory,
      `.upload-extract-${suffix}`
    );

  const preparedDirectory =
    path.join(
      leadDirectory,
      `.upload-ready-${suffix}`
    );

  await mkdirAsync(
    extractionDirectory,
    {
      recursive: true
    }
  );

  try {
    await extractZip(
      input.buffer,
      extractionDirectory
    );

    const sourceRoot =
      await normalizeExtractedRoot(
        extractionDirectory
      );

    await cpAsync(
      sourceRoot,
      preparedDirectory,
      {
        recursive: true
      }
    );

    const preview =
      uploadedPreviewState(
        lead,
        input.originalName
      );

    return await prepareSwap(
      lead,
      preparedDirectory,
      preview,
      artifactDir
    );
  } finally {
    await rmAsync(
      extractionDirectory,
      {
        recursive: true,
        force: true
      }
    );

    await rmAsync(
      preparedDirectory,
      {
        recursive: true,
        force: true
      }
    );
  }
}

export async function prepareRestoreGeneratedPreview(
  lead: Lead,
  artifactDir = config.artifactDir
): Promise<PreviewSwapTransaction> {
  const leadDirectory =
    path.join(
      artifactDir,
      lead.id
    );

  const generatedDirectory =
    path.join(
      leadDirectory,
      "demo-generated"
    );

  await readFileAsync(
    path.join(
      generatedDirectory,
      "index.html"
    )
  ).catch(() => {
    throw new Error(
      "No generated preview is available to restore."
    );
  });

  const preparedDirectory =
    path.join(
      leadDirectory,
      `.restore-ready-${process.pid}-${Date.now()}`
    );

  await cpAsync(
    generatedDirectory,
    preparedDirectory,
    {
      recursive: true
    }
  );

  try {
    return await prepareSwap(
      lead,
      preparedDirectory,
      restoredPreviewState(lead),
      artifactDir
    );
  } finally {
    await rmAsync(
      preparedDirectory,
      {
        recursive: true,
        force: true
      }
    );
  }
}
