import express, { type Express, type Request, type Response } from "express";
import "./brand.js";
import { sendApprovedOutreach } from "./communications.js";
import { config } from "./config.js";
import { renderDashboard, renderNotFoundDashboard } from "./dashboard.js";
import { parseDashboardPage } from "./dashboard-model.js";
import { approveLead, generateForLead, setLeadStage } from "./pipeline.js";
import { buildReport } from "./report.js";
import { LeadStore } from "./store.js";
import type { LeadStage } from "./types.js";

export { renderDashboard } from "./dashboard.js";

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
  "/settings",
] as const;

export function createApp(store = new LeadStore()): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  const renderPage = async (req: Request, res: Response): Promise<void> => {
    if (req.path === "/" && typeof req.query.lead === "string" && req.query.lead.trim()) {
      res.redirect(302, `/leads/${encodeURIComponent(req.query.lead)}`);
      return;
    }
    const page = parseDashboardPage(req.path);
    if (!page) {
      res.status(404).type("html").send(renderNotFoundDashboard(await store.all()));
      return;
    }
    res.type("html").send(
      renderDashboard(await store.all(), page, {
        generatePreview: true,
        uploadPreview: false,
        restoreGeneratedPreview: false,
      }),
    );
  };

  for (const pagePath of pagePaths) app.get(pagePath, renderPage);
  app.get("/leads/:id", renderPage);

  app.get("/api/leads", async (_req, res) => res.json(await store.all()));
  app.get("/api/report", async (_req, res) => res.json(buildReport(await store.all())));

  app.post("/api/leads/:id/generate", async (req, res) => {
    try {
      res.json(await generateForLead(req.params.id, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.post("/api/leads/:id/approve", async (req, res) => {
    try {
      res.json(await approveLead(req.params.id, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.post("/api/leads/:id/send", async (req, res) => {
    try {
      res.json(await sendApprovedOutreach(req.params.id, { store }));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.post("/api/leads/:id/stage", async (req, res) => {
    try {
      res.json(await setLeadStage(req.params.id, req.body.stage as LeadStage, store));
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : String(error));
    }
  });

  app.use(async (_req, res) => {
    res.status(404).type("html").send(renderNotFoundDashboard(await store.all()));
  });

  return app;
}

export async function startServer(store = new LeadStore()): Promise<void> {
  const app = createApp(store);
  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      console.log(`TechTactics Web Growth Command Center: http://${config.host}:${config.port}`);
      resolve();
    });
  });
}
