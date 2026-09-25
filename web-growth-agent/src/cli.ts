#!/usr/bin/env node
import { auditAll, approveLead, generateForLead, qualifyAll, setLeadStage } from "./pipeline.js";
import { sendAgentEmail, sendApprovedOutreach, setLeadContactEmail } from "./communications.js";
import { readZohoMail, replyZohoEmail, zohoMailStatus } from "./zoho.js";
import { buildReport } from "./report.js";
import { scoutAndStore } from "./scout.js";
import { seedFixtures } from "./seed.js";
import { startServer } from "./server.js";
import { LeadStore } from "./store.js";
import type { AgentRole, LeadStage } from "./types.js";

const args = process.argv.slice(2);
const command = args[0] || "help";
const store = new LeadStore();

function values(flag: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) result.push(args[i + 1]);
  }
  return result;
}
function value(flag: string): string | undefined {
  return values(flag)[0];
}
function numberValue(flag: string, fallback: number): number {
  const raw = value(flag);
  const parsed = raw ? Number(raw) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function help(): void {
  console.log(`
TechTactics Web Growth Agent

Commands:
  seed
      Load synthetic evaluation leads.

  scout --market "Prairieville, LA" --category plumber [--category electrician] [--max-results 10]
      Discover businesses with Google Places. A market and at least one category are required to avoid accidental broad API usage.

  audit --all
      Audit all active leads and calculate evidence-based scores.

  qualify [--min-score 35]
      Move audited leads at/above the threshold to qualified.

  generate --lead <id>
      Generate human-review sales assets and a private static demo for one qualified lead.

  approve --lead <id>
      Explicit human approval gate for outreach.

  stage --lead <id> --to contacted|responded|proposal|won|lost
      Advance a lead using the allowed stage machine.

  run --market "Prairieville, LA" --category plumber [--category electrician] [--max-results 10]
      Scout, audit, and qualify. Does not generate AI assets or send outreach.

  contact-email --lead <id> --email <address>
      Set or correct the customer email used for approved outreach.

  zoho-status
      Verify the configured Zoho Mail MCP connection with read-only tools.

  mail-read --task "<request>"
      Search/read Zoho Mail with read-only tools. Email content is treated as untrusted data.

  mail-reply --message-id <id> --body "<text>"
      Explicitly send one reply to an existing Zoho Mail message.

  send --lead <id> [--subject "<subject>"]
      Send the reviewed outreach draft through Zoho. Requires the lead to already be approved.

  agent-mail --from sales --to manager --subject "<subject>" --body "<text>"
      Send one internal role-to-role message to a configured agent mailbox.

  report
      Print pipeline metrics and top opportunities.

  serve
      Run the local dashboard on 127.0.0.1.
`);
}

async function main(): Promise<void> {
  if (command === "help" || command === "--help" || command === "-h") return help();

  if (command === "seed") {
    const seeded = await seedFixtures(store);
    console.log(`Seeded ${seeded.length} synthetic leads.`);
    return;
  }

  if (command === "scout" || command === "run") {
    const market = value("--market");
    const categories = values("--category");
    if (!market || !categories.length) throw new Error("--market and at least one --category are required.");
    const maxResults = numberValue("--max-results", 10);
    let discovered = 0;
    for (const category of categories) {
      const leads = await scoutAndStore({ market, category, maxResults }, store);
      discovered += leads.length;
      console.log(`Scouted ${leads.length} results for ${category} in ${market}.`);
    }
    if (command === "scout") return;
    const audited = await auditAll(store);
    const qualified = await qualifyAll(numberValue("--min-score", 35), store);
    console.log(`Run complete: discovered/updated ${discovered}, audited ${audited.length}, newly qualified ${qualified.length}.`);
    return;
  }

  if (command === "audit") {
    const audited = await auditAll(store);
    console.log(`Audited ${audited.length} active leads.`);
    return;
  }

  if (command === "qualify") {
    const qualified = await qualifyAll(numberValue("--min-score", 35), store);
    console.log(`Newly qualified ${qualified.length} leads.`);
    return;
  }

  if (command === "generate") {
    const id = value("--lead");
    if (!id) throw new Error("--lead is required.");
    const lead = await generateForLead(id, store);
    console.log(JSON.stringify({ id: lead.id, stage: lead.stage, demoPath: lead.demoPath, package: lead.salesAssets?.recommendedPackage }, null, 2));
    return;
  }

  if (command === "approve") {
    const id = value("--lead");
    if (!id) throw new Error("--lead is required.");
    const lead = await approveLead(id, store);
    console.log(`Approved ${lead.businessName} for human-controlled outreach.`);
    return;
  }

  if (command === "stage") {
    const id = value("--lead");
    const next = value("--to") as LeadStage | undefined;
    if (!id || !next) throw new Error("--lead and --to are required.");
    const lead = await setLeadStage(id, next, store);
    console.log(`${lead.businessName}: ${lead.stage}`);
    return;
  }

  if (command === "contact-email") {
    const id = value("--lead");
    const email = value("--email");
    if (!id || !email) throw new Error("--lead and --email are required.");
    const lead = await setLeadContactEmail(id, email, store);
    console.log("Contact email set for " + lead.businessName + ": " + lead.contactEmail);
    return;
  }

  if (command === "zoho-status") {
    console.log(await zohoMailStatus());
    return;
  }

  if (command === "mail-read") {
    const task = value("--task");
    if (!task) throw new Error("--task is required.");
    console.log(await readZohoMail(task));
    return;
  }

  if (command === "mail-reply") {
    const messageId = value("--message-id");
    const body = value("--body");
    if (!messageId || !body) throw new Error("--message-id and --body are required.");
    console.log((await replyZohoEmail(messageId, body)).summary);
    return;
  }

  if (command === "send") {
    const id = value("--lead");
    if (!id) throw new Error("--lead is required.");
    const lead = await sendApprovedOutreach(id, { subject: value("--subject"), store });
    console.log("Zoho outreach sent to " + lead.contactEmail + "; lead moved to contacted.");
    return;
  }

  if (command === "agent-mail") {
    const from = value("--from") as AgentRole | undefined;
    const to = value("--to") as AgentRole | undefined;
    const subject = value("--subject");
    const body = value("--body");
    if (!from || !to || !subject || !body) throw new Error("--from, --to, --subject, and --body are required.");
    console.log((await sendAgentEmail(from, to, subject, body)).summary);
    return;
  }

  if (command === "report") {
    console.log(JSON.stringify(buildReport(await store.all()), null, 2));
    return;
  }

  if (command === "serve") return startServer(store);

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
