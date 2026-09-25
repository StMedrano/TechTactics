import OpenAI from "openai";
import { config } from "./config.js";

function client(): OpenAI {
  if (!config.openAIKey) {
    throw new Error("OPENAI_API_KEY is required for Zoho Books MCP orchestration.");
  }
  if (!config.zohoBooksMcpUrl) {
    throw new Error("ZOHO_BOOKS_MCP_URL is not configured.");
  }
  return new OpenAI({ apiKey: config.openAIKey });
}

function readTool(): any {
  if (!config.zohoBooksReadTools.length) {
    throw new Error(
      "WGA_ZOHO_BOOKS_READ_TOOLS is empty. Configure it with read-only tool names exposed by your Zoho Books MCP server."
    );
  }
  return {
    type: "mcp",
    server_label: "zoho_books",
    server_url: config.zohoBooksMcpUrl,
    allowed_tools: config.zohoBooksReadTools,
    require_approval: "never"
  };
}

function assertReadOnlyResponse(response: any): void {
  const calls = Array.isArray(response?.output)
    ? response.output.filter((item: any) => item?.type === "mcp_call")
    : [];
  if (!calls.length) throw new Error("Zoho Books MCP did not execute a configured read-only tool.");
  const failed = calls.find((call: any) =>
    Boolean(call.error) || ["failed", "incomplete"].includes(String(call.status || "").toLowerCase())
  );
  if (failed) {
    throw new Error("Zoho Books MCP read failed: " + JSON.stringify(failed.error || failed.output || failed.status));
  }
}

export async function zohoBooksStatus(): Promise<string> {
  const response = await client().responses.create({
    model: config.openAIModel,
    input:
      "Use one or more configured read-only Zoho Books tools to confirm access to the organization. " +
      "Do not create, update, delete, reconcile, send, pay, transfer, file, submit, or otherwise mutate financial data. " +
      "Return a short connection/accounting-data summary.",
    tools: [readTool()] as any
  });
  assertReadOnlyResponse(response);
  return response.output_text?.trim() || "Zoho Books MCP read-only connection succeeded.";
}

export async function readZohoBooks(task: string): Promise<string> {
  const request = task.trim();
  if (!request) throw new Error("An accounting request is required.");
  if (request.length > 4000) throw new Error("Accounting request is too long.");

  const response = await client().responses.create({
    model: config.openAIModel,
    input:
      "You are the TechTactics Accounting and Business Tax support agent. " +
      "Use only the configured read-only Zoho Books tools. Never create, update, delete, reconcile, send, pay, transfer, file, submit, or mutate records. " +
      "Separate booked facts from estimates and assumptions. For tax questions, identify the period and jurisdiction needed, flag missing records, " +
      "and prepare a review-ready summary rather than claiming a return is filed or a tax position is final. " +
      "Operator request: " + request,
    tools: [readTool()] as any
  });
  assertReadOnlyResponse(response);
  return response.output_text?.trim() || "Zoho Books read-only analysis completed.";
}
