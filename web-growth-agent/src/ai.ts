import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "./config.js";
import { packages, recommendPackage, websiteCare } from "./packages.js";
import type { Lead, SalesAssets } from "./types.js";
import { nowIso } from "./utils.js";

const AiAssetSchema = z.object({
  businessSummary: z.string().min(1).max(3000),
  outreachDraft: z.string().min(1).max(5000),
  proposalMarkdown: z.string().min(1).max(15000),
  demoHeadline: z.string().min(1).max(160),
  demoSubheadline: z.string().min(1).max(300),
  demoServices: z.array(z.string().min(1).max(120)).min(3).max(6)
});

function evidenceLines(lead: Lead): string[] {
  if (!lead.score?.items.length) {
    return lead.website
      ? ["No scored issues have been recorded yet."]
      : ["No website URL is listed in the business record."];
  }

  return lead.score.items.map(
    (item) => `${item.label}: ${item.evidence}`
  );
}

function fallbackAssets(lead: Lead): SalesAssets {
  const selected = recommendPackage(lead);
  const evidence = evidenceLines(lead);
  const category = lead.category || "local business";
  const issues = evidence.slice(0, 3).join(" ");

  return {
    generatedAt: nowIso(),

    businessSummary:
      `${lead.businessName} is a ${category} prospect in ` +
      `${lead.market || "the local market"}. ` +
      `Recorded opportunity evidence: ${issues}`,

    outreachDraft:
      `Hi ${lead.businessName} team — I’m with TechTactics. ` +
      `I came across your business while researching local companies ` +
      `and noticed an opportunity around your web presence. ` +
      `I put together a private concept showing how a clearer, ` +
      `mobile-friendly website could present your services and make ` +
      `it easier for customers to contact you. If you’d like, I can ` +
      `send the preview and walk through what we found. — TechTactics`,

    proposalMarkdown:
      `# TechTactics website concept for ${lead.businessName}\n\n` +
      `## Observed opportunity\n` +
      `${evidence.map((line) => `- ${line}`).join("\n")}\n\n` +
      `## Recommended package: ${selected.name}\n` +
      `${selected.description}\n\n` +
      `**Typical range:** ${selected.priceRange}\n\n` +
      `### Includes\n` +
      `${selected.includes.map((item) => `- ${item}`).join("\n")}\n\n` +
      `### Optional ongoing care\n` +
      `${websiteCare.name}: ${websiteCare.priceRange}.\n\n` +
      `This is a draft concept and pricing range for human review, ` +
      `not a binding quote.\n`,

    demoHeadline: `A clearer online home for ${lead.businessName}`,

    demoSubheadline:
      `A modern concept designed to help local customers quickly ` +
      `understand your services and take the next step.`,

    demoServices: [
      `${category} services`,
      "Fast, clear customer contact",
      "Mobile-friendly local experience"
    ],

    recommendedPackage: selected.name
  };
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generateWithGroq(prompt: string): Promise<string> {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.groqModel,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 6000,
        response_format: {
          type: "json_object"
        }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Groq request failed: HTTP ${response.status} ` +
      `${response.statusText}: ${body.slice(0, 500)}`
    );
  }

  const payload: any = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Groq response did not contain message content.");
  }

  return text;
}

async function generateWithGemini(prompt: string): Promise<string> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const client = new GoogleGenAI({
    apiKey: config.geminiApiKey
  });

  const response = await client.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  if (!response.text) {
    throw new Error("Gemini response was empty.");
  }

  return response.text;
}

export async function generateSalesAssets(
  lead: Lead
): Promise<SalesAssets> {
  if (!config.groqApiKey && !config.geminiApiKey) {
    return fallbackAssets(lead);
  }

  const selected = recommendPackage(lead);

  const factualRecord = {
    businessName: lead.businessName,
    category: lead.category,
    market: lead.market,
    address: lead.address,
    phone: lead.phone,
    website: lead.website,
    rating: lead.rating,
    ratingCount: lead.ratingCount,
    audit: lead.audit,
    score: lead.score,
    recommendedPackage: packages[selected.name],
    optionalCarePlan: websiteCare
  };

  const prompt = `You are the TechTactics Web Growth Sales Asset agent.

Create sales-support assets for a HUMAN to review.

Return JSON only with exactly these keys:
businessSummary,
outreachDraft,
proposalMarkdown,
demoHeadline,
demoSubheadline,
demoServices.

Rules:
- Use only facts present in the supplied record.
- Never invent business history, services, certifications, awards,
  customer counts, reviews, owners, or website defects.
- Audit statements must be traceable to supplied audit/score evidence.
- If a service is unknown, keep demo service wording generic to
  the supplied category.
- Outreach must be respectful, concise, personalized, and must not
  claim an existing relationship.
- outreachDraft must contain the email body only. Do not include a Subject line.
- Never use placeholders such as [Your Name], [Name], [Company], or similar template text.
- Sign outreach as TechTactics.
- Address the business by name when practical instead of using generic wording such as "Hi there".
- Do not say a message was sent or that the prospect agreed to anything.
- Proposal is a draft with a non-binding price range.
- Do not include legal/compliance claims.
- The demo headline/subheadline should sound polished without pretending
  the concept is the company's official website.
- demoServices must contain 3 to 6 short strings.

FACTUAL RECORD:
${JSON.stringify(factualRecord, null, 2)}`;

  let text: string;

  try {
    if (config.salesAiProvider === "groq") {
      text = await generateWithGroq(prompt);
    } else {
      text = await generateWithGemini(prompt);
    }
  } catch (primaryError) {
    const canFallbackToGemini =
      config.salesAiProvider === "groq" &&
      Boolean(config.geminiApiKey);

    if (!canFallbackToGemini) {
      throw primaryError;
    }

    console.warn(
      "Primary Groq sales generation failed; falling back to Gemini:",
      primaryError instanceof Error
        ? primaryError.message
        : primaryError
    );

    text = await generateWithGemini(prompt);
  }

  const parsed = AiAssetSchema.parse(extractJson(text));

  return {
    generatedAt: nowIso(),
    ...parsed,
    recommendedPackage: selected.name
  };
}
