import { buildReport, type PipelineReport } from "./report.js";
import type { Lead, LeadStage } from "./types.js";

export type DashboardPageId =
  | "overview"
  | "leads"
  | "lead"
  | "pipeline"
  | "previews"
  | "agents"
  | "inbox"
  | "accounting"
  | "legal"
  | "integrations"
  | "settings";

export interface DashboardPage {
  id: DashboardPageId;
  path: string;
  title: string;
  description: string;
  leadId?: string;
}

export interface DashboardCapabilities {
  generatePreview: boolean;
  uploadPreview: boolean;
  restoreGeneratedPreview: boolean;
}

export interface DashboardMetrics {
  ownerAttention: number;
  activeLeads: number;
  projectedPipelineValue: number;
  totalLeads: number;
}

export interface DashboardViewModel {
  page: DashboardPage;
  leads: Lead[];
  selectedLead?: Lead;
  report: PipelineReport;
  priorityWork: Lead[];
  capabilities: DashboardCapabilities;
  metrics: DashboardMetrics;
  stageGroups: Record<LeadStage, Lead[]>;
}

export const dashboardStageOrder: LeadStage[] = [
  "new",
  "audited",
  "qualified",
  "demo_ready",
  "approved",
  "contacted",
  "responded",
  "proposal",
  "won",
  "lost",
];

const staticPages: Record<Exclude<DashboardPageId, "lead">, DashboardPage> = {
  overview: {
    id: "overview",
    path: "/",
    title: "Overview",
    description: "A quick look at the work that needs your attention.",
  },
  leads: {
    id: "leads",
    path: "/leads",
    title: "Leads",
    description: "Search and review every local business opportunity.",
  },
  pipeline: {
    id: "pipeline",
    path: "/pipeline",
    title: "Pipeline",
    description: "Follow opportunities from discovery through close.",
  },
  previews: {
    id: "previews",
    path: "/previews",
    title: "Previews",
    description: "Review private website concepts before anything is shared.",
  },
  agents: {
    id: "agents",
    path: "/agents",
    title: "Agents",
    description: "See each specialist's role and current readiness.",
  },
  inbox: {
    id: "inbox",
    path: "/inbox",
    title: "Inbox",
    description: "Review approvals, handoffs, and blocked work.",
  },
  accounting: {
    id: "accounting",
    path: "/accounting",
    title: "Accounting",
    description: "View read-only financial workflow status.",
  },
  legal: {
    id: "legal",
    path: "/legal",
    title: "Legal",
    description: "Prepare non-binding compliance and agreement support.",
  },
  integrations: {
    id: "integrations",
    path: "/integrations",
    title: "Integrations",
    description: "Check provider readiness and permission boundaries.",
  },
  settings: {
    id: "settings",
    path: "/settings",
    title: "Settings",
    description: "Review non-secret command-center configuration.",
  },
};

const pathToPage = new Map(
  Object.values(staticPages).map((page) => [page.path, page] as const),
);

export function parseDashboardPage(pathname: string): DashboardPage | undefined {
  const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const page = pathToPage.get(normalized);
  if (page) return { ...page };

  const leadMatch = normalized.match(/^\/leads\/([^/]+)$/);
  if (!leadMatch) return undefined;

  try {
    const leadId = decodeURIComponent(leadMatch[1]);
    if (!leadId.trim()) return undefined;
    return {
      id: "lead",
      path: `/leads/${encodeURIComponent(leadId)}`,
      title: "Lead Workspace",
      description: "Review evidence, preview work, and guarded outreach actions.",
      leadId,
    };
  } catch {
    return undefined;
  }
}

const priorityByStage: Partial<Record<LeadStage, number>> = {
  approved: 0,
  demo_ready: 1,
  qualified: 2,
  audited: 3,
  new: 4,
  responded: 5,
  proposal: 6,
  contacted: 7,
};

function byMostRecent(a: Lead, b: Lead): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id);
}

export function buildDashboardViewModel(
  leads: Lead[],
  page: DashboardPage = staticPages.overview,
  capabilities: Partial<DashboardCapabilities> = {},
): DashboardViewModel {
  const sortedLeads = [...leads].sort(byMostRecent);
  const report = buildReport(sortedLeads);
  const stageGroups = Object.fromEntries(
    dashboardStageOrder.map((stage) => [
      stage,
      sortedLeads.filter((lead) => lead.stage === stage),
    ]),
  ) as Record<LeadStage, Lead[]>;
  const priorityWork = sortedLeads
    .filter((lead) => priorityByStage[lead.stage] !== undefined)
    .sort((a, b) => {
      const stageDifference =
        (priorityByStage[a.stage] ?? Number.MAX_SAFE_INTEGER) -
        (priorityByStage[b.stage] ?? Number.MAX_SAFE_INTEGER);
      return stageDifference || byMostRecent(a, b);
    })
    .slice(0, 3);

  return {
    page,
    leads: sortedLeads,
    selectedLead: page.leadId
      ? sortedLeads.find((lead) => lead.id === page.leadId)
      : undefined,
    report,
    priorityWork,
    capabilities: {
      generatePreview: capabilities.generatePreview ?? false,
      uploadPreview: capabilities.uploadPreview ?? false,
      restoreGeneratedPreview: capabilities.restoreGeneratedPreview ?? false,
    },
    metrics: {
      ownerAttention: sortedLeads.filter((lead) =>
        lead.stage === "demo_ready" || lead.stage === "approved",
      ).length,
      activeLeads: sortedLeads.filter(
        (lead) => lead.stage !== "won" && lead.stage !== "lost",
      ).length,
      projectedPipelineValue: report.projectedPipelineValue,
      totalLeads: report.totalLeads,
    },
    stageGroups,
  };
}
