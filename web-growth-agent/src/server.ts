import express from "express";
import "./brand.js";
import { config } from "./config.js";
import { approveLead, setLeadStage } from "./pipeline.js";
import { sendApprovedOutreach } from "./communications.js";
import { renderDashboard } from "./dashboard.js";
import { buildReport } from "./report.js";
import { LeadStore } from "./store.js";
import type { LeadStage } from "./types.js";

export { renderDashboard } from "./dashboard.js";

export async function startServer(store = new LeadStore()): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    const selectedLeadId = typeof req.query.lead === "string" ? req.query.lead : undefined;
    res.type("html").send(renderDashboard(await store.all(), selectedLeadId));
  });
  app.get("/api/leads", async (_req, res) => res.json(await store.all()));
  app.get("/api/report", async (_req, res) => res.json(buildReport(await store.all())));

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

  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      console.log(`TechTactics Web Growth Command Center: http://${config.host}:${config.port}`);
      resolve();
    });
  });
}
