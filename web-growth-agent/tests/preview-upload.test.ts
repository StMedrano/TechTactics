import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yazl from "yazl";

import type { Lead } from "../src/types.js";
import {
  prepareRestoreGeneratedPreview,
  prepareUploadedPreview
} from "../src/preview.js";

function lead(): Lead {
  return {
    id: "lead_upload_test",
    source: "fixture",
    businessName: "Upload Test Business",
    discoveredAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    stage: "demo_ready",
    approvedForOutreach: false,
    preview: {
      source: "generated",
      updatedAt: "2026-09-27T00:00:00.000Z",
      entrypoint: "index.html",
      previewUrlPath: "/preview/lead_upload_test/",
      generatedAt: "2026-09-27T00:00:00.000Z"
    },
    notes: []
  };
}

async function zipBuffer(
  files: Array<{
    name: string;
    contents: string | Buffer;
    mode?: number;
  }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const chunks: Buffer[] = [];

    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      zip.addBuffer(
        Buffer.isBuffer(file.contents)
          ? file.contents
          : Buffer.from(file.contents),
        file.name,
        file.mode === undefined
          ? undefined
          : { mode: file.mode }
      );
    }

    zip.end();
  });
}

async function createArtifactRoot() {
  return mkdtemp(path.join(os.tmpdir(), "wga-preview-upload-"));
}


function replaceZipEntryName(
  input: Buffer,
  from: string,
  to: string
): Buffer {
  if (Buffer.byteLength(from) !== Buffer.byteLength(to)) {
    throw new Error("ZIP entry replacement names must have equal byte length.");
  }

  const output = Buffer.from(input);
  const fromBuffer = Buffer.from(from);
  const toBuffer = Buffer.from(to);

  let offset = 0;
  let replacements = 0;

  while (true) {
    const index = output.indexOf(fromBuffer, offset);
    if (index < 0) break;

    toBuffer.copy(output, index);
    offset = index + toBuffer.length;
    replacements += 1;
  }

  if (replacements < 2) {
    throw new Error(
      `Expected ZIP filename in local and central headers; found ${replacements}.`
    );
  }

  return output;
}

describe("preview upload validation", () => {

  it("rejects traversal paths including backslash variants", async () => {
    const artifactDir = await createArtifactRoot();

    const safe = await zipBuffer([
      {
        name: "aa/index.html",
        contents: "<html>Unsafe</html>"
      }
    ]);

    const unixTraversal = replaceZipEntryName(
      safe,
      "aa/index.html",
      "../index.html"
    );

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: unixTraversal,
          originalName: "traversal.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/path|unsafe|traversal/i);

    const windowsTraversal = replaceZipEntryName(
      safe,
      "aa/index.html",
      "..\\index.html"
    );

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: windowsTraversal,
          originalName: "windows-traversal.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/path|unsafe|traversal/i);
  });

  it("rejects absolute paths", async () => {
    const artifactDir = await createArtifactRoot();

    const safe = await zipBuffer([
      {
        name: "xindex.html",
        contents: "<html>Unsafe</html>"
      }
    ]);

    const absolute = replaceZipEntryName(
      safe,
      "xindex.html",
      "/index.html"
    );

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: absolute,
          originalName: "absolute.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/path|unsafe|absolute/i);
  });

  it("rejects symbolic-link archive entries", async () => {
    const artifactDir = await createArtifactRoot();

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "target",
        mode: 0o120777
      }
    ]);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "symlink.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/link|entry|type|unsupported/i);
  });

  it("does not flatten multiple unrelated roots", async () => {
    const artifactDir = await createArtifactRoot();

    const zip = await zipBuffer([
      {
        name: "site-a/index.html",
        contents: "<html>A</html>"
      },
      {
        name: "site-b/site.css",
        contents: "body{}"
      }
    ]);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "multiple-roots.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/index\.html|root/i);
  });



  it("rejects compressed uploads larger than 25 MB", async () => {
    const artifactDir = await createArtifactRoot();

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
          originalName: "too-large.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/size|large|25|upload/i);
  });

  it("rejects more than 500 files", async () => {
    const artifactDir = await createArtifactRoot();

    const files = [
      {
        name: "index.html",
        contents: "<html>Index</html>"
      }
    ];

    for (let i = 0; i < 500; i += 1) {
      files.push({
        name: `assets/file-${i}.txt`,
        contents: "x"
      });
    }

    const zip = await zipBuffer(files);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "too-many-files.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/500|file|entry|count/i);
  });

  it("rejects an individual extracted file over 20 MB", async () => {
    const artifactDir = await createArtifactRoot();

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Index</html>"
      },
      {
        name: "assets/oversized.bin",
        contents: Buffer.alloc(20 * 1024 * 1024 + 1)
      }
    ]);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "oversized-file.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/20|file|size|large/i);
  });

  it("rejects total extracted bytes over 100 MB while streaming", async () => {
    const artifactDir = await createArtifactRoot();

    const files: Array<{
      name: string;
      contents: string | Buffer;
    }> = [
      {
        name: "index.html",
        contents: "<html>Index</html>"
      }
    ];

    for (let i = 0; i < 6; i += 1) {
      files.push({
        name: `assets/chunk-${i}.bin`,
        contents: Buffer.alloc(17 * 1024 * 1024)
      });
    }

    const zip = await zipBuffer(files);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "zip-bomb.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/100|total|size|large/i);
  });

  it("rejects fifo device and socket entry modes", async () => {
    const artifactDir = await createArtifactRoot();

    for (const mode of [
      0o010644,
      0o020644,
      0o060644,
      0o140644
    ]) {
      const zip = await zipBuffer([
        {
          name: "index.html",
          contents: "unsafe",
          mode
        }
      ]);

      await expect(
        prepareUploadedPreview(
          lead(),
          {
            buffer: zip,
            originalName: "unsupported-entry.zip"
          },
          artifactDir
        )
      ).rejects.toThrow(/entry|type|unsupported/i);
    }
  });


  it("accepts a valid root index.html ZIP", async () => {
    const artifactDir = await createArtifactRoot();
    const zip = await zipBuffer([
      { name: "index.html", contents: "<html>Uploaded</html>" },
      { name: "assets/site.css", contents: "body{}" }
    ]);

    const tx = await prepareUploadedPreview(
      lead(),
      {
        buffer: zip,
        originalName: "site.zip"
      },
      artifactDir
    );

    const active = await readFile(
      path.join(
        artifactDir,
        "lead_upload_test",
        "demo",
        "index.html"
      ),
      "utf8"
    );

    expect(active).toContain("Uploaded");
    expect(tx.preview.source).toBe("uploaded");
    expect(tx.preview.uploadedFileName).toBe("site.zip");

    await tx.rollback();
  });

  it("accepts exactly one enclosing folder and normalizes it", async () => {
    const artifactDir = await createArtifactRoot();
    const zip = await zipBuffer([
      {
        name: "my-site/index.html",
        contents: "<html>Nested</html>"
      },
      {
        name: "my-site/assets/site.css",
        contents: "body{}"
      }
    ]);

    const tx = await prepareUploadedPreview(
      lead(),
      {
        buffer: zip,
        originalName: "nested.zip"
      },
      artifactDir
    );

    const active = await readFile(
      path.join(
        artifactDir,
        "lead_upload_test",
        "demo",
        "index.html"
      ),
      "utf8"
    );

    expect(active).toContain("Nested");

    await tx.rollback();
  });

  it("rejects ZIP missing index.html", async () => {
    const artifactDir = await createArtifactRoot();
    const zip = await zipBuffer([
      {
        name: "assets/site.css",
        contents: "body{}"
      }
    ]);

    await expect(
      prepareUploadedPreview(
        lead(),
        {
          buffer: zip,
          originalName: "missing-index.zip"
        },
        artifactDir
      )
    ).rejects.toThrow(/index\.html/i);
  });

  it("preserves generated preview before activating uploaded preview", async () => {
    const artifactDir = await createArtifactRoot();

    const generatedDir = path.join(
      artifactDir,
      "lead_upload_test",
      "demo-generated"
    );

    const activeDir = path.join(
      artifactDir,
      "lead_upload_test",
      "demo"
    );

    await mkdir(generatedDir, { recursive: true });
    await mkdir(activeDir, { recursive: true });

    await writeFile(
      path.join(generatedDir, "index.html"),
      "<html>Generated</html>",
      "utf8"
    );

    await writeFile(
      path.join(activeDir, "index.html"),
      "<html>Generated</html>",
      "utf8"
    );

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Uploaded</html>"
      }
    ]);

    const tx = await prepareUploadedPreview(
      lead(),
      {
        buffer: zip,
        originalName: "uploaded.zip"
      },
      artifactDir
    );

    expect(
      await readFile(
        path.join(generatedDir, "index.html"),
        "utf8"
      )
    ).toContain("Generated");

    expect(
      await readFile(
        path.join(activeDir, "index.html"),
        "utf8"
      )
    ).toContain("Uploaded");

    await tx.rollback();
  });

  it("rollback restores previous active preview", async () => {
    const artifactDir = await createArtifactRoot();

    const activeDir = path.join(
      artifactDir,
      "lead_upload_test",
      "demo"
    );

    await mkdir(activeDir, { recursive: true });

    await writeFile(
      path.join(activeDir, "index.html"),
      "<html>Original</html>",
      "utf8"
    );

    const zip = await zipBuffer([
      {
        name: "index.html",
        contents: "<html>Replacement</html>"
      }
    ]);

    const tx = await prepareUploadedPreview(
      lead(),
      {
        buffer: zip,
        originalName: "replacement.zip"
      },
      artifactDir
    );

    await tx.rollback();

    expect(
      await readFile(
        path.join(activeDir, "index.html"),
        "utf8"
      )
    ).toContain("Original");
  });

  it("restores the canonical generated preview", async () => {
    const artifactDir = await createArtifactRoot();

    const leadDir = path.join(
      artifactDir,
      "lead_upload_test"
    );

    await mkdir(
      path.join(leadDir, "demo-generated"),
      { recursive: true }
    );

    await mkdir(
      path.join(leadDir, "demo"),
      { recursive: true }
    );

    await writeFile(
      path.join(
        leadDir,
        "demo-generated",
        "index.html"
      ),
      "<html>Generated</html>",
      "utf8"
    );

    await writeFile(
      path.join(
        leadDir,
        "demo",
        "index.html"
      ),
      "<html>Uploaded</html>",
      "utf8"
    );

    const tx = await prepareRestoreGeneratedPreview(
      {
        ...lead(),
        preview: {
          ...lead().preview!,
          source: "uploaded",
          uploadedFileName: "uploaded.zip"
        }
      },
      artifactDir
    );

    expect(tx.preview.source).toBe("generated");

    expect(
      await readFile(
        path.join(
          leadDir,
          "demo",
          "index.html"
        ),
        "utf8"
      )
    ).toContain("Generated");

    await tx.rollback();
  });
});
