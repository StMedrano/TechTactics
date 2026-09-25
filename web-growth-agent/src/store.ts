import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import type { Lead, LeadStoreFile } from "./types.js";

const EMPTY: LeadStoreFile = { version: 1, leads: [] };

export class LeadStore {
  private readonly filePath: string;

  constructor(filePath = path.join(config.dataDir, "leads.json")) {
    this.filePath = filePath;
  }

  async load(): Promise<LeadStoreFile> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as LeadStoreFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.leads)) {
        throw new Error("Unsupported lead store format");
      }
      return parsed;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        await this.save(EMPTY);
        return structuredClone(EMPTY);
      }
      throw error;
    }
  }

  async save(data: LeadStoreFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  async all(): Promise<Lead[]> {
    return (await this.load()).leads;
  }

  async get(id: string): Promise<Lead | undefined> {
    return (await this.load()).leads.find((lead) => lead.id === id);
  }

  async upsert(incoming: Lead): Promise<Lead> {
    const data = await this.load();
    const index = data.leads.findIndex((lead) =>
      lead.id === incoming.id ||
      (!!incoming.sourceId && lead.source === incoming.source && lead.sourceId === incoming.sourceId)
    );
    if (index >= 0) {
      data.leads[index] = incoming;
    } else {
      data.leads.push(incoming);
    }
    await this.save(data);
    return incoming;
  }

  async update(id: string, updater: (lead: Lead) => Lead): Promise<Lead> {
    const data = await this.load();
    const index = data.leads.findIndex((lead) => lead.id === id);
    if (index < 0) throw new Error(`Lead not found: ${id}`);
    const updated = updater(data.leads[index]);
    data.leads[index] = { ...updated, updatedAt: new Date().toISOString() };
    await this.save(data);
    return data.leads[index];
  }

  async replaceAll(leads: Lead[]): Promise<void> {
    await this.save({ version: 1, leads });
  }
}
