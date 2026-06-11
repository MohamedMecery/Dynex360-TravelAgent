export const OPS_RULE_VERSION = "v1.0.0";

export type OpsEntityType = "booking";
export type OpsOperationalStatus =
  | "healthy"
  | "attention_required"
  | "at_risk"
  | "critical";
export type OpsRecommendationStatus = "open" | "dismissed" | "completed" | "expired";
export type OpsRecommendationPriority = "critical" | "high" | "normal" | "low";

export interface OpsRiskIndicator {
  code: string;
  severity: "high" | "medium" | "low";
  label: string;
  evidence?: Record<string, unknown>;
}

export interface OpsReadinessItem {
  code: string;
  label: string;
  complete: boolean;
  evidence?: Record<string, unknown>;
}

export interface OpsSnapshotRecord {
  id: string;
  tenant_id: string;
  entity_type: OpsEntityType;
  entity_id: string;
  health_score: number | null;
  risk_score: number | null;
  readiness_score: number | null;
  operational_status: OpsOperationalStatus | null;
  confidence: number;
  risk_indicators: OpsRiskIndicator[];
  readiness_checklist: OpsReadinessItem[];
  score_breakdown: Record<string, unknown>;
  rule_version: string;
  inputs_hash: string;
  computed_at: string;
}

export interface OpsRecommendationRecord {
  id: string;
  tenant_id: string;
  entity_type: OpsEntityType;
  entity_id: string;
  recommendation_code: string;
  priority: OpsRecommendationPriority;
  title: string;
  description: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: OpsRecommendationStatus;
  source_event_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface OpsInsightsPayload {
  period: { from: string; to: string };
  upcoming_departures: Array<{
    booking_id: string;
    reference_number: string;
    travel_date: string;
    status: string;
    health_score: number | null;
    readiness_score: number | null;
    operational_status: string | null;
  }>;
  at_risk_bookings_count: number;
  missing_documents_count: number;
  traveler_actions_count: number;
  voucher_backlog_count: number;
  payment_gaps_pre_departure: number;
  open_recommendations_count: number;
  departures_7d_count: number;
  readiness_summary: { status: string; count: number }[];
}
