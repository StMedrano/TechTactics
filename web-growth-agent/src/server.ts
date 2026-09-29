import { createReadStream } from "node:fs";
import {
  realpath,
  stat
} from "node:fs/promises";
import path from "node:path";

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express";

import multer from "multer";

import "./brand.js";

import {
  sendApprovedOutreach
} from "./communications.js";

import {
  config
} from "./config.js";

import {
  renderDashboard,
  renderNotFoundDashboard
} from "./dashboard.js";

import {
  parseDashboardPage
} from "./dashboard-model.js";

import {
  approveLead,
  generateForLead,
  restoreGeneratedPreviewForLead,
  setLeadStage,
  uploadPreviewForLead
} from "./pipeline.js";

import {
  buildReport
} from "./report.js";

import {
  LeadStore
} from "./store.js";

import type {
  LeadStage
} from "./types.js";

export {
  renderDashboard
} from "./dashboard.js";

const previewUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        config.maxPreviewUploadBytes,

      files:
        1
    }
  });

function errorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

function isPreviewClientError(
  error: unknown
): boolean {
  if (
    error instanceof
      multer.MulterError
  ) {
    return true;
  }

  const message =
    errorMessage(error);

  return [
    /lead not found/i,
    /must be qualified/i,
    /current stage/i,
    /no generated preview/i,
    /preview zip/i,
    /preview upload/i,
    /unsafe/i,
    /unsupported.*entry/i,
    /index\.html/i,
    /file limit/i,
    /size limit/i,
    /extracted size/i,
    /not a zip/i,
    /central directory/i
  ].some(
    pattern =>
      pattern.test(message)
  );
}

function sendPreviewError(
  error: unknown,
  res: Response
): void {
  if (
    error instanceof
      multer.MulterError
  ) {
    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      res
        .status(400)
        .send(
          "Preview upload exceeds the configured size limit."
        );

      return;
    }

    res
      .status(400)
      .send(
        `Invalid preview upload: ${error.message}`
      );

    return;
  }

  if (
    isPreviewClientError(error)
  ) {
    res
      .status(400)
      .send(
        errorMessage(error)
      );

    return;
  }

  console.error(
    "Unexpected command-center preview error:",
    error
  );

  res
    .status(500)
    .send(
      "Internal server error."
    );
}

const pagePaths = [
  "/",
  "/leads",
  "/pipeline",
  "/previews",
  "/agents",
  "/inbox",
  "/accounting",
  "/legal",
  "/integrations",
  "/settings"
] as const;

async function privatePreviewPath(
  demoPath: string
): Promise<
  string | undefined
> {
  try {
    const [
      artifactRoot,
      candidate
    ] =
      await Promise.all([
        realpath(
          config.artifactDir
        ),

        realpath(
          path.resolve(
            demoPath
          )
        )
      ]);

    const relative =
      path.relative(
        artifactRoot,
        candidate
      );

    if (
      !relative ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return undefined;
    }

    if (
      !(
        await stat(candidate)
      ).isFile()
    ) {
      return undefined;
    }

    return candidate;
  } catch {
    return undefined;
  }
}

export function createApp(
  store = new LeadStore()
): Express {
  const app =
    express();

  app.disable(
    "x-powered-by"
  );

  app.use(
    express.json({
      limit:
        "64kb"
    })
  );

  const renderPage =
    async (
      req: Request,
      res: Response
    ): Promise<void> => {
      if (
        req.path === "/" &&
        typeof req.query.lead ===
          "string" &&
        req.query.lead.trim()
      ) {
        res.redirect(
          302,
          `/leads/${encodeURIComponent(
            req.query.lead
          )}`
        );

        return;
      }

      const page =
        parseDashboardPage(
          req.path
        );

      if (!page) {
        res
          .status(404)
          .type("html")
          .send(
            renderNotFoundDashboard(
              await store.all()
            )
          );

        return;
      }

      res
        .type("html")
        .send(
          renderDashboard(
            await store.all(),
            page,
            {
              generatePreview:
                true,

              uploadPreview:
                true,

              restoreGeneratedPreview:
                true
            }
          )
        );
    };

  for (
    const pagePath
    of pagePaths
  ) {
    app.get(
      pagePath,
      renderPage
    );
  }

  app.get(
    "/leads/:id",
    renderPage
  );

  app.get(
    "/api/leads",
    async (
      _req,
      res
    ) =>
      res.json(
        await store.all()
      )
  );

  app.get(
    "/api/report",
    async (
      _req,
      res
    ) =>
      res.json(
        buildReport(
          await store.all()
        )
      )
  );

  /*
   * Private in-app preview route retained from the
   * multipage hardening work.
   */
  app.get(
    "/api/leads/:id/preview",
    async (
      req,
      res
    ) => {
      const lead =
        await store.get(
          req.params.id
        );

      const previewPath =
        lead?.demoPath
          ? await privatePreviewPath(
              lead.demoPath
            )
          : undefined;

      if (!previewPath) {
        res
          .status(404)
          .type("text")
          .send(
            "Preview not found"
          );

        return;
      }

      res.set({
        "Cache-Control":
          "private, no-store",

        "Content-Security-Policy":
          "default-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; script-src 'none'; frame-ancestors 'self'",

        "X-Content-Type-Options":
          "nosniff",

        "X-Robots-Tag":
          "noindex, nofollow, noarchive"
      });

      res.type(
        "html"
      );

      const preview =
        createReadStream(
          previewPath
        );

      preview.on(
        "error",
        () => {
          if (
            !res.headersSent
          ) {
            res
              .status(404)
              .type("text")
              .send(
                "Preview not found"
              );
          } else {
            res.destroy();
          }
        }
      );

      preview.pipe(res);
    }
  );

  app.post(
    "/api/leads/:id/generate",
    async (
      req,
      res
    ) => {
      try {
        res.json(
          await generateForLead(
            req.params.id,
            store
          )
        );
      } catch (
        error
      ) {
        sendPreviewError(
          error,
          res
        );
      }
    }
  );

  app.post(
    "/api/leads/:id/upload-preview",
    previewUpload.single(
      "site"
    ),
    async (
      req,
      res
    ) => {
      try {
        if (!req.file) {
          res
            .status(400)
            .send(
              'Preview upload requires multipart file field "site".'
            );

          return;
        }

        const leadId =
          Array.isArray(
            req.params.id
          )
            ? req.params.id[0]
            : req.params.id;

        if (!leadId) {
          res
            .status(400)
            .send(
              "Lead id is required."
            );

          return;
        }

        res.json(
          await uploadPreviewForLead(
            leadId,
            {
              buffer:
                req.file.buffer,

              originalName:
                req.file.originalname
            },
            store
          )
        );
      } catch (
        error
      ) {
        sendPreviewError(
          error,
          res
        );
      }
    }
  );

  app.post(
    "/api/leads/:id/restore-generated-preview",
    async (
      req,
      res
    ) => {
      try {
        res.json(
          await restoreGeneratedPreviewForLead(
            req.params.id,
            store
          )
        );
      } catch (
        error
      ) {
        sendPreviewError(
          error,
          res
        );
      }
    }
  );

  app.post(
    "/api/leads/:id/approve",
    async (
      req,
      res
    ) => {
      try {
        res.json(
          await approveLead(
            req.params.id,
            store
          )
        );
      } catch (
        error
      ) {
        res
          .status(400)
          .send(
            errorMessage(error)
          );
      }
    }
  );

  app.post(
    "/api/leads/:id/send",
    async (
      req,
      res
    ) => {
      try {
        res.json(
          await sendApprovedOutreach(
            req.params.id,
            {
              store
            }
          )
        );
      } catch (
        error
      ) {
        res
          .status(400)
          .send(
            errorMessage(error)
          );
      }
    }
  );

  app.post(
    "/api/leads/:id/stage",
    async (
      req,
      res
    ) => {
      try {
        res.json(
          await setLeadStage(
            req.params.id,
            req.body.stage as LeadStage,
            store
          )
        );
      } catch (
        error
      ) {
        res
          .status(400)
          .send(
            errorMessage(error)
          );
      }
    }
  );

  /*
   * Keep the multipage 404 experience.
   */
  app.use(
    async (
      _req,
      res
    ) => {
      res
        .status(404)
        .type("html")
        .send(
          renderNotFoundDashboard(
            await store.all()
          )
        );
    }
  );

  /*
   * URI failures preserve the multipage 400 response.
   *
   * All other unexpected errors use the preview API's
   * generic 500 response so internal filesystem details
   * cannot leak to the client.
   */
  app.use(
    async (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      if (
        error instanceof
          URIError
      ) {
        res
          .status(400)
          .type("html")
          .send(
            renderNotFoundDashboard(
              await store.all()
            )
          );

        return;
      }

      sendPreviewError(
        error,
        res
      );
    }
  );

  return app;
}

/*
 * Compatibility export retained for preview API tests and
 * callers introduced by the isolated-preview work.
 */
export function createServerApp(
  store = new LeadStore()
): Express {
  return createApp(
    store
  );
}

export async function startServer(
  store = new LeadStore()
): Promise<void> {
  const app =
    createApp(store);

  await new Promise<void>(
    resolve => {
      app.listen(
        config.port,
        config.host,
        () => {
          console.log(
            `TechTactics Web Growth Command Center: http://${config.host}:${config.port}`
          );

          resolve();
        }
      );
    }
  );
}
