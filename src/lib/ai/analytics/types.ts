import type { AiAgentKey } from "@/types";

/** Phase 6 — token/cost metrics (not implemented in V1). */
export interface AgentCostMetrics {
  total_tokens?: number;
  estimated_usd?: number;
  model_breakdown?: Record<string, number>;
}

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

export interface AnalyticsExecutive {
  total_conversations: number;
  active_users: number;
  feedback_rate: number | null;
}

export interface AgentUsageRow {
  agent_key: AiAgentKey;
  count: number;
}

export interface AnalyticsSupport {
  tickets_created: number;
  tickets_resolved: number;
}

export interface TopDocumentRow {
  document_id: string;
  document_title: string;
  reference_count: number;
}

export interface TopPackageRow {
  package_id: string;
  package_title: string;
  booking_count: number;
}

export interface TopDestinationRow {
  destination_id: string;
  destination_name: string;
  booking_count: number;
}

export interface DailyCountRow {
  day: string;
  conversation_count?: number;
  active_users?: number;
}

export interface AnalyticsUsageTrends {
  conversation_volume: Array<{ day: string; conversation_count: number }>;
  daily_active_users: Array<{ day: string; active_users: number }>;
}

export interface AiAnalyticsData {
  period: AnalyticsPeriod;
  executive: AnalyticsExecutive;
  agent_usage: AgentUsageRow[];
  support: AnalyticsSupport;
  top_documents: TopDocumentRow[];
  top_packages: TopPackageRow[];
  top_destinations: TopDestinationRow[];
  usage_trends: AnalyticsUsageTrends;
  insights: string[];
  /** Phase 6 extension point */
  cost?: AgentCostMetrics;
}

export type AnalyticsExportType = "feedback" | "usage" | "support";

export type AnalyticsPreset = "today" | "7d" | "30d" | "90d" | "custom";
