import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

type McpStep = {
  type?: string;
  name?: string;
  id?: string;
  server_name?: string;
};

function client(): GoogleGenAI {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required for Zoho Books MCP orchestration.");
  }
  if (!config.zohoBooksMcpUrl) {
    throw new Error("ZOHO_BOOKS_MCP_URL is not configured.");
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

function readTool(): any {
  if (!config.zohoBooksReadTools.length) {
    throw new Error(
      "WGA_ZOHO_BOOKS_READ_TOOLS is empty. Configure it with read-only tool names exposed by your Zoho Books MCP server."
    );
  }
  return {
    type: "mcp_server",
    name: "zoho_books",
    url: config.zohoBooksMcpUrl,
    allowed_tools: [{ mode: "any", tools: [...config.zohoBooksReadTools] }]
  };
}

function toolKey(name: string): string {
  let value = String(name || "").trim();

  if (value.includes(":")) {
    value = value.split(":").pop() || value;
  }

  value = value.replace(/^ZohoBooks_/i, "");

  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertReadOnlyCalls(interaction: any): void {
  const calls = Array.isArray(interaction?.steps)
    ? interaction.steps.filter(
        (step: McpStep) => step?.type === "mcp_server_tool_call"
      )
    : [];

  if (!calls.length) {
    throw new Error(
      "Zoho Books MCP did not execute a configured read-only tool."
    );
  }

  const allowed = new Set(
    config.zohoBooksReadTools.map(toolKey)
  );

  const unexpected = calls.find(
    (call: McpStep) =>
      !allowed.has(toolKey(String(call.name || "")))
  );

  if (unexpected) {
    throw new Error(
      "Zoho Books MCP executed an unexpected tool: " +
      String(unexpected.name || "unknown")
    );
  }
}

async function runReadOnly(input: string): Promise<string> {
  const interaction = await client().interactions.create({
    model: config.mcpModel,
    input,
    tools: [readTool()] as any
  });
  assertReadOnlyCalls(interaction);
  return interaction.output_text?.trim() || "Zoho Books read-only analysis completed.";
}

export async function zohoBooksStatus(): Promise<string> {
  if (!config.zohoBooksMcpUrl) {
    throw new Error("ZOHO_BOOKS_MCP_URL is not configured.");
  }

  if (!config.zohoBooksReadTools.length) {
    throw new Error("WGA_ZOHO_BOOKS_READ_TOOLS is empty.");
  }

  const response = await fetch(config.zohoBooksMcpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "Zoho Books MCP connection failed: HTTP " +
      response.status +
      " " +
      response.statusText
    );
  }

  let payload: any;

  try {
    payload = JSON.parse(text);
  } catch {
    const dataLine = text
      .split("\n")
      .find((line) => line.startsWith("data:"));

    if (!dataLine) {
      throw new Error("Zoho Books MCP returned an unreadable response.");
    }

    payload = JSON.parse(dataLine.slice(5).trim());
  }

  const tools = Array.isArray(payload?.result?.tools)
    ? payload.result.tools
    : [];

  const exposed = new Set(
    tools.map((tool: any) =>
      String(tool?.name || "").toLowerCase()
    )
  );

  const available = config.zohoBooksReadTools.filter((name) =>
    exposed.has(name.toLowerCase())
  );

  if (!available.length) {
    throw new Error(
      "Zoho Books MCP authenticated, but none of the configured read-only tools are available."
    );
  }

  return (
    "Zoho Books MCP authenticated successfully; " +
    available.length +
    "/" +
    config.zohoBooksReadTools.length +
    " configured read-only tools are available."
  );
}

export async function readZohoBooks(task: string): Promise<string> {
  const request = task.trim();
  if (!request) throw new Error("An accounting request is required.");
  if (request.length > 4000) throw new Error("Accounting request is too long.");

  return runReadOnly(
    "You are the TechTactics Accounting and Business Tax support agent. " +
    "Use only the configured read-only Zoho Books tools. Never create, update, delete, reconcile, send, pay, transfer, file, submit, or mutate records. " +
    "Separate booked facts from estimates and assumptions. For tax questions, identify the period and jurisdiction needed, flag missing records, " +
    "and prepare a review-ready summary rather than claiming a return is filed or a tax position is final. " +
    "Operator request: " + request
  );
}
