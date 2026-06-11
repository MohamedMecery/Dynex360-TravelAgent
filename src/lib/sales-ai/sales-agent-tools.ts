import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchRecommendations,
  fetchSnapshot,
} from "@/lib/sales-ai/recommendation-service";
import type { SalesEntityType } from "@/lib/sales-ai/types";

export interface SalesAgentContext {
  snapshot: Record<string, unknown> | null;
  recommendations: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
  quotations: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  citations: { type: string; id: string; label: string }[];
}

export async function buildSalesAgentContext(
  supabase: SupabaseClient,
  input: {
    entityType?: SalesEntityType;
    entityId?: string;
    customerId?: string;
    opportunityId?: string;
  }
): Promise<SalesAgentContext> {
  const citations: { type: string; id: string; label: string }[] = [];
  let entityType = input.entityType;
  let entityId = input.entityId;

  if (!entityType && input.opportunityId) {
    entityType = "opportunity";
    entityId = input.opportunityId;
  }
  if (!entityType && input.customerId) {
    entityType = "customer";
    entityId = input.customerId;
  }

  let snapshot = null;
  if (entityType && entityId) {
    const snap = await fetchSnapshot(supabase, entityType, entityId);
    if (snap) {
      snapshot = {
        id: snap.id,
        entity_type: snap.entity_type,
        health_score: snap.health_score,
        priority_score: snap.priority_score,
        win_probability: snap.win_probability,
        priority_tier: snap.priority_tier,
        confidence: snap.confidence,
        risk_indicators: snap.risk_indicators,
        score_breakdown: snap.score_breakdown,
        computed_at: snap.computed_at,
        rule_version: snap.rule_version,
      };
      citations.push({
        type: "snapshot",
        id: snap.id,
        label: `Score snapshot ${snap.rule_version}`,
      });
    }
  }

  const recommendations = await fetchRecommendations(supabase, {
    entityType,
    entityId,
    limit: 5,
  });

  for (const rec of recommendations) {
    citations.push({ type: "recommendation", id: rec.id, label: rec.title });
  }

  let timeline: Record<string, unknown>[] = [];
  const customerId =
    input.customerId ??
    (entityType === "customer" ? entityId : undefined);

  if (customerId) {
    const { data: events } = await supabase
      .from("v_customer_timeline_events")
      .select("id, event_type, title, occurred_at, meta")
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: false })
      .limit(15);

    timeline = (events ?? []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      title: e.title,
      occurred_at: e.occurred_at,
    }));
    if (timeline[0]) {
      citations.push({
        type: "timeline",
        id: String(timeline[0].id),
        label: "Customer timeline",
      });
    }
  }

  let quotations: Record<string, unknown>[] = [];
  const oppId = input.opportunityId ?? (entityType === "opportunity" ? entityId : undefined);
  if (oppId) {
    const { data: quotes } = await supabase
      .from("quotations")
      .select("id, quotation_number, status, total_amount, currency, sent_at, viewed_at, accepted_at, valid_until")
      .eq("opportunity_id", oppId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    quotations = quotes ?? [];
    if (quotations[0]) {
      citations.push({
        type: "quotation",
        id: String(quotations[0].id),
        label: String(quotations[0].quotation_number),
      });
    }
  }

  let payments: Record<string, unknown>[] = [];
  if (customerId) {
    const { data: orders } = await supabase
      .from("payment_orders")
      .select("id, order_type, amount, currency, status, created_at, quotation_id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5);

    payments = (orders ?? []).map((o) => ({
      id: o.id,
      order_type: o.order_type,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      created_at: o.created_at,
    }));
  }

  return {
    snapshot,
    recommendations: recommendations.map((r) => ({
      id: r.id,
      code: r.recommendation_code,
      priority: r.priority,
      title: r.title,
      description: r.description,
      action_type: r.action_type,
    })),
    timeline,
    quotations,
    payments,
    citations,
  };
}

export function formatSalesContextForPrompt(ctx: SalesAgentContext): string {
  return [
    "=== Precomputed Sales Snapshot (authoritative — do not invent scores) ===",
    JSON.stringify(ctx.snapshot, null, 2),
    "",
    "=== Open Recommendations ===",
    JSON.stringify(ctx.recommendations, null, 2),
    "",
    "=== Recent Timeline (max 15) ===",
    JSON.stringify(ctx.timeline, null, 2),
    "",
    "=== Quotations ===",
    JSON.stringify(ctx.quotations, null, 2),
    "",
    "=== Payment Orders ===",
    JSON.stringify(ctx.payments, null, 2),
    "",
    "=== Evidence Citations ===",
    JSON.stringify(ctx.citations, null, 2),
  ].join("\n");
}
