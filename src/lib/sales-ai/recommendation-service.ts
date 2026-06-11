import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SalesEntityType,
  SalesInsightsPayload,
  SalesRecommendationRecord,
  SalesSnapshotRecord,
} from "@/lib/sales-ai/types";

export async function fetchSnapshot(
  supabase: SupabaseClient,
  entityType: SalesEntityType,
  entityId: string
): Promise<SalesSnapshotRecord | null> {
  const { data, error } = await supabase
    .from("ai_sales_snapshots")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as SalesSnapshotRecord | null) ?? null;
}

export async function fetchRecommendations(
  supabase: SupabaseClient,
  filters?: {
    entityType?: SalesEntityType;
    entityId?: string;
    status?: string;
    limit?: number;
  }
): Promise<SalesRecommendationRecord[]> {
  let query = supabase
    .from("ai_sales_recommendations")
    .select("*")
    .eq("status", filters?.status ?? "open")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.entityId) query = query.eq("entity_id", filters.entityId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesRecommendationRecord[];
}

export async function dismissRecommendation(
  supabase: SupabaseClient,
  recommendationId: string,
  userId: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: rec, error: fetchError } = await supabase
    .from("ai_sales_recommendations")
    .select("tenant_id")
    .eq("id", recommendationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("ai_sales_recommendations")
    .update({
      status: "dismissed",
      dismissed_at: now,
      dismissed_by: userId,
      updated_at: now,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);

  await supabase.from("ai_sales_recommendation_feedback").insert({
    tenant_id: rec.tenant_id,
    recommendation_id: recommendationId,
    user_id: userId,
    action: "dismissed",
    reason: reason ?? null,
  });
}

export async function completeRecommendation(
  supabase: SupabaseClient,
  recommendationId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: rec, error: fetchError } = await supabase
    .from("ai_sales_recommendations")
    .select("tenant_id")
    .eq("id", recommendationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("ai_sales_recommendations")
    .update({
      status: "completed",
      completed_at: now,
      completed_by: userId,
      updated_at: now,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);

  await supabase.from("ai_sales_recommendation_feedback").insert({
    tenant_id: rec.tenant_id,
    recommendation_id: recommendationId,
    user_id: userId,
    action: "completed",
  });
}

export async function fetchSalesInsights(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<SalesInsightsPayload> {
  const { data, error } = await supabase.rpc("get_sales_insights", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) throw new Error(error.message);
  return data as SalesInsightsPayload;
}

export async function fetchSalesDashboardWidgets(
  supabase: SupabaseClient
): Promise<{
  hot_leads: Array<{
    id: string;
    full_name: string;
    lead_number: string;
    priority_score: number;
    priority_tier: string;
  }>;
  at_risk_opportunities: Array<{
    id: string;
    opportunity_number: string;
    destination_text: string | null;
    health_score: number;
  }>;
  open_recommendations_count: number;
}> {
  const { data: hotSnapshots } = await supabase
    .from("ai_sales_snapshots")
    .select("entity_id, priority_score, priority_tier")
    .eq("entity_type", "lead")
    .eq("priority_tier", "hot")
    .order("priority_score", { ascending: false })
    .limit(10);

  const hotLeadIds = (hotSnapshots ?? []).map((s) => s.entity_id);
  let hot_leads: Array<{
    id: string;
    full_name: string;
    lead_number: string;
    priority_score: number;
    priority_tier: string;
  }> = [];

  if (hotLeadIds.length > 0) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, full_name, lead_number")
      .in("id", hotLeadIds)
      .is("deleted_at", null);

    hot_leads = (leads ?? []).map((lead) => {
      const snap = hotSnapshots?.find((s) => s.entity_id === lead.id);
      return {
        id: lead.id,
        full_name: lead.full_name,
        lead_number: lead.lead_number,
        priority_score: snap?.priority_score ?? 0,
        priority_tier: snap?.priority_tier ?? "hot",
      };
    });
  }

  const { data: riskSnapshots } = await supabase
    .from("ai_sales_snapshots")
    .select("entity_id, health_score")
    .eq("entity_type", "opportunity")
    .lt("health_score", 50)
    .order("health_score", { ascending: true })
    .limit(10);

  const riskOppIds = (riskSnapshots ?? []).map((s) => s.entity_id);
  let at_risk_opportunities: Array<{
    id: string;
    opportunity_number: string;
    destination_text: string | null;
    health_score: number;
  }> = [];

  if (riskOppIds.length > 0) {
    const { data: opps } = await supabase
      .from("opportunities")
      .select("id, opportunity_number, destination_text, stage")
      .in("id", riskOppIds)
      .is("deleted_at", null)
      .in("stage", ["discovery", "proposal", "negotiation", "verbal_approval"]);

    at_risk_opportunities = (opps ?? []).map((opp) => {
      const snap = riskSnapshots?.find((s) => s.entity_id === opp.id);
      return {
        id: opp.id,
        opportunity_number: opp.opportunity_number,
        destination_text: opp.destination_text,
        health_score: snap?.health_score ?? 0,
      };
    });
  }

  const { count } = await supabase
    .from("ai_sales_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return {
    hot_leads,
    at_risk_opportunities,
    open_recommendations_count: count ?? 0,
  };
}
