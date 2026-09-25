import { recommendPackage } from "./packages.js";
import type { Lead, LeadStage } from "./types.js";

const stageOrder: LeadStage[] = ["new","audited","qualified","demo_ready","approved","contacted","responded","proposal","won","lost"];
const estimatedValues = { Launch: 1000, Growth: 2000, Pro: 4000 } as const;

export interface PipelineReport {
  totalLeads: number;
  counts: Record<LeadStage, number>;
  qualifiedOrBeyond: number;
  projectedPipelineValue: number;
  topOpportunities: Array<{ id: string; businessName: string; score: number; stage: LeadStage; recommendedPackage: string }>;
}

export function buildReport(leads: Lead[]): PipelineReport {
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<LeadStage, number>;
  for (const lead of leads) counts[lead.stage]++;

  const activeStages = new Set<LeadStage>(["qualified","demo_ready","approved","contacted","responded","proposal"]);
  const active = leads.filter((lead) => activeStages.has(lead.stage));
  const projectedPipelineValue = active.reduce((sum, lead) => {
    const pkg = recommendPackage(lead);
    return sum + estimatedValues[pkg.name];
  }, 0);

  return {
    totalLeads: leads.length,
    counts,
    qualifiedOrBeyond: active.length + counts.won,
    projectedPipelineValue,
    topOpportunities: [...leads]
      .filter((lead) => lead.stage !== "lost")
      .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1))
      .slice(0, 10)
      .map((lead) => ({
        id: lead.id,
        businessName: lead.businessName,
        score: lead.score?.total ?? 0,
        stage: lead.stage,
        recommendedPackage: recommendPackage(lead).name
      }))
  };
}
