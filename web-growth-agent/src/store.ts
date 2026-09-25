import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { config } from "./config.js";
import type { Lead, LeadStoreFile } from "./types.js";

const EMPTY: LeadStoreFile = { version: 1, leads: [] };

export class LeadStore {
  private static readonly queues = new Map<string, Promise<void>>();
  private readonly filePath: string;

  constructor(filePath = path.join(config.dataDir, "leads.json")) {
    this.filePath = path.resolve(filePath);
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = LeadStore.queues.get(this.filePath) || Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => gate);
    LeadStore.queues.set(this.filePath, tail);

    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (LeadStore.queues.get(this.filePath) === tail) LeadStore.queues.delete(this.filePath);
    }
  }

  private async loadUnlocked(): Promise<LeadStoreFile> {
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
      if (code === "ENOENT") return structuredClone(EMPTY);
      throw error;
    }
  }

  private async saveUnlocked(data: LeadStoreFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = this.filePath + "." + process.pid + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", "utf8");
      await rename(temporary, this.filePath);
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  async load(): Promise<LeadStoreFile> {
    return this.loadUnlocked();
  }

  async save(data: LeadStoreFile): Promise<void> {
    await this.withWriteLock(() => this.saveUnlocked(data));
  }

  async all(): Promise<Lead[]> {
    return (await this.loadUnlocked()).leads;
  }

  async get(id: string): Promise<Lead | undefined> {
    return (await this.loadUnlocked()).leads.find((lead) => lead.id === id);
  }

  async upsert(incoming: Lead): Promise<Lead> {
    return this.withWriteLock(async () => {
      const data = await this.loadUnlocked();
      const index = data.leads.findIndex((lead) =>
        lead.id === incoming.id ||
        (!!incoming.sourceId && lead.source === incoming.source && lead.sourceId === incoming.sourceId)
      );
      if (index >= 0) {
        data.leads[index] = incoming;
      } else {
        data.leads.push(incoming);
      }
      await this.saveUnlocked(data);
      return incoming;
    });
  }

  async update(id: string, updater: (lead: Lead) => Lead): Promise<Lead> {
    return this.withWriteLock(async () => {
      const data = await this.loadUnlocked();
      const index = data.leads.findIndex((lead) => lead.id === id);
      if (index < 0) throw new Error("Lead not found: " + id);
      const updated = updater(data.leads[index]);
      data.leads[index] = { ...updated, updatedAt: new Date().toISOString() };
      await this.saveUnlocked(data);
      return data.leads[index];
    });
  }

  async replaceAll(leads: Lead[]): Promise<void> {
    await this.withWriteLock(() => this.saveUnlocked({ version: 1, leads }));
  }
}
