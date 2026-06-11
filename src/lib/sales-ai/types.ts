export const SALES_RULE_VERSION = "v1.0.0";

export type SalesEntityType = "lead" | "opportunity" | "customer";
export type SalesPriorityTier = "hot" | "warm" | "cold";
export type SalesRecommendationStatus = "open" | "dismissed" | "completed" | "expired";
export type SalesRecommendationPriority = "critical" | "high" | "normal" | "low";

export interface SalesRiskIndicator {
  code: string;
  severity: "high" | "medium" | "low";
  label: string;
  evidence?: Record<string, unknown>;
}

export interface SalesSnapshotRecord {
  id: string;
  tenant_id: string;
  entity_type: SalesEntityType;
  entity_id: string;
  health_score: number | null;
  priority_score: number | null;
  win_probability: number | null;
  priority_tier: SalesPriorityTier | null;
  confidence: number;
  risk_indicators: SalesRiskIndicator[];
  score_breakdown: Record<string, unknown>;
  rule_version: string;
  inputs_hash: string;
  computed_at: string;
}

export interface SalesRecommendationRecord {
  id: string;
  tenant_id: string;
  entity_type: SalesEntityType;
  entity_id: string;
  recommendation_code: string;
  priority: SalesRecommendationPriority;
  title: string;
  description: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: SalesRecommendationStatus;
  source_event_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface SalesInsightsPayload {
  period: { from: string; to: string };
  lead_funnel: { stage: string; count: number }[];
  quotation_funnel: { status: string; count: number }[];
  acceptance_rate: number | null;
  payment_conversion: number | null;
  top_packages: { package_id: string | null; package_name: string; count: number }[];
  top_destinations: { destination: string; count: number }[];
  lost_reasons: { reason: string; count: number }[];
  rep_leaderboard: {
    owner_id: string;
    owner_name: string;
    won_count: number;
    won_revenue: number;
    open_count: number;
  }[];
  open_recommendations_count: number;
  hot_leads_count: number;
  at_risk_opportunities_count: number;
}
