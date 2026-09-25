export type LeadStage =
  | "new"
  | "audited"
  | "qualified"
  | "demo_ready"
  | "approved"
  | "contacted"
  | "responded"
  | "proposal"
  | "won"
  | "lost";

export type AgentRole = "manager" | "scout" | "auditor" | "designer" | "sales" | "accounting" | "legal";

export interface AuditEvidence {
  checkedAt: string;
  reachable: boolean;
  finalUrl?: string;
  statusCode?: number;
  responseMs?: number;
  https: boolean;
  title?: string;
  contactEmail?: string;
  hasMetaDescription: boolean;
  hasViewportMeta: boolean;
  hasContactForm: boolean;
  hasPhoneLink: boolean;
  hasEmailLink: boolean;
  hasPrimaryCta: boolean;
  hasStructuredData: boolean;
  hasAnalyticsMarker: boolean;
  oldCopyrightYear?: number;
  contentLength?: number;
  notes: string[];
}

export interface ScoreItem {
  key: string;
  label: string;
  points: number;
  evidence: string;
}

export interface OpportunityScore {
  total: number;
  items: ScoreItem[];
  calculatedAt: string;
}

export interface SalesAssets {
  generatedAt: string;
  businessSummary: string;
  outreachDraft: string;
  proposalMarkdown: string;
  demoHeadline: string;
  demoSubheadline: string;
  demoServices: string[];
  recommendedPackage: "Launch" | "Growth" | "Pro";
}

export interface CommunicationRecord {
  at: string;
  channel: "zoho_email";
  kind: "customer_outreach" | "agent_internal";
  direction: "outbound";
  to: string;
  subject: string;
  fromAgent?: AgentRole;
  toAgent?: AgentRole;
  providerCallId?: string;
}

export interface Lead {
  id: string;
  source: "google_places" | "fixture" | "manual";
  sourceId?: string;
  businessName: string;
  category?: string;
  market?: string;
  address?: string;
  phone?: string;
  website?: string;
  contactEmail?: string;
  googleMapsUrl?: string;
  rating?: number;
  ratingCount?: number;
  discoveredAt: string;
  updatedAt: string;
  stage: LeadStage;
  approvedForOutreach: boolean;
  audit?: AuditEvidence;
  score?: OpportunityScore;
  salesAssets?: SalesAssets;
  demoPath?: string;
  communications?: CommunicationRecord[];
  notes: string[];
}

export interface LeadStoreFile {
  version: 1;
  leads: Lead[];
}
