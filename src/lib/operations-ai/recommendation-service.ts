import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OpsEntityType,
  OpsInsightsPayload,
  OpsRecommendationRecord,
  OpsSnapshotRecord,
} from "@/lib/operations-ai/types";

export async function fetchOpsSnapshot(
  supabase: SupabaseClient,
  entityType: OpsEntityType,
  entityId: string
): Promise<OpsSnapshotRecord | null> {
  const { data, error } = await supabase
    .from("ai_ops_snapshots")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OpsSnapshotRecord | null) ?? null;
}

export async function fetchOpsRecommendations(
  supabase: SupabaseClient,
  filters?: {
    entityType?: OpsEntityType;
    entityId?: string;
    customerId?: string;
    status?: string;
    limit?: number;
  }
): Promise<OpsRecommendationRecord[]> {
  let query = supabase
    .from("ai_ops_recommendations")
    .select("*")
    .eq("status", filters?.status ?? "open")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.entityId) query = query.eq("entity_id", filters.entityId);

  if (filters?.customerId) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", filters.customerId)
      .is("deleted_at", null)
      .in("status", ["draft", "confirmed"]);

    const ids = (bookings ?? []).map((b) => b.id);
    if (ids.length === 0) return [];
    query = query.in("entity_id", ids);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OpsRecommendationRecord[];
}

export async function dismissOpsRecommendation(
  supabase: SupabaseClient,
  recommendationId: string,
  userId: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: rec, error: fetchError } = await supabase
    .from("ai_ops_recommendations")
    .select("tenant_id")
    .eq("id", recommendationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("ai_ops_recommendations")
    .update({
      status: "dismissed",
      dismissed_at: now,
      dismissed_by: userId,
      updated_at: now,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);

  await supabase.from("ai_ops_recommendation_feedback").insert({
    tenant_id: rec.tenant_id,
    recommendation_id: recommendationId,
    user_id: userId,
    action: "dismissed",
    reason: reason ?? null,
  });
}

export async function completeOpsRecommendation(
  supabase: SupabaseClient,
  recommendationId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: rec, error: fetchError } = await supabase
    .from("ai_ops_recommendations")
    .select("tenant_id")
    .eq("id", recommendationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("ai_ops_recommendations")
    .update({
      status: "completed",
      completed_at: now,
      completed_by: userId,
      updated_at: now,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);

  await supabase.from("ai_ops_recommendation_feedback").insert({
    tenant_id: rec.tenant_id,
    recommendation_id: recommendationId,
    user_id: userId,
    action: "completed",
  });
}

export async function fetchOperationsInsights(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<OpsInsightsPayload> {
  const { data, error } = await supabase.rpc("get_operations_insights", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) throw new Error(error.message);
  return data as OpsInsightsPayload;
}

export async function fetchOperationsDashboardWidgets(
  supabase: SupabaseClient
): Promise<{
  at_risk_bookings: Array<{
    id: string;
    reference_number: string;
    travel_date: string | null;
    health_score: number;
    readiness_score: number;
    operational_status: string;
  }>;
  departures_7d: Array<{
    id: string;
    reference_number: string;
    travel_date: string;
    readiness_score: number | null;
  }>;
  open_recommendations_count: number;
}> {
  const today = new Date();
  const in7d = new Date(today);
  in7d.setDate(in7d.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const in7dStr = in7d.toISOString().slice(0, 10);

  const { data: riskSnapshots } = await supabase
    .from("ai_ops_snapshots")
    .select("entity_id, health_score, readiness_score, operational_status")
    .eq("entity_type", "booking")
    .in("operational_status", ["at_risk", "critical"])
    .order("health_score", { ascending: true })
    .limit(10);

  const riskIds = (riskSnapshots ?? []).map((s) => s.entity_id);
  let at_risk_bookings: Array<{
    id: string;
    reference_number: string;
    travel_date: string | null;
    health_score: number;
    readiness_score: number;
    operational_status: string;
  }> = [];

  if (riskIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, reference_number, travel_date")
      .in("id", riskIds)
      .is("deleted_at", null);

    at_risk_bookings = (bookings ?? []).map((b) => {
      const snap = riskSnapshots?.find((s) => s.entity_id === b.id);
      return {
        id: b.id,
        reference_number: b.reference_number,
        travel_date: b.travel_date,
        health_score: snap?.health_score ?? 0,
        readiness_score: snap?.readiness_score ?? 0,
        operational_status: snap?.operational_status ?? "at_risk",
      };
    });
  }

  const { data: departureBookings } = await supabase
    .from("bookings")
    .select("id, reference_number, travel_date")
    .is("deleted_at", null)
    .in("status", ["draft", "confirmed"])
    .gte("travel_date", todayStr)
    .lt("travel_date", in7dStr)
    .order("travel_date", { ascending: true })
    .limit(10);

  const depIds = (departureBookings ?? []).map((b) => b.id);
  let readinessMap = new Map<string, number | null>();
  if (depIds.length > 0) {
    const { data: snaps } = await supabase
      .from("ai_ops_snapshots")
      .select("entity_id, readiness_score")
      .eq("entity_type", "booking")
      .in("entity_id", depIds);

    readinessMap = new Map(
      (snaps ?? []).map((s) => [s.entity_id, s.readiness_score])
    );
  }

  const departures_7d = (departureBookings ?? []).map((b) => ({
    id: b.id,
    reference_number: b.reference_number,
    travel_date: b.travel_date!,
    readiness_score: readinessMap.get(b.id) ?? null,
  }));

  const { count } = await supabase
    .from("ai_ops_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return {
    at_risk_bookings,
    departures_7d,
    open_recommendations_count: count ?? 0,
  };
}

export async function fetchCustomerOpsStrip(
  supabase: SupabaseClient,
  customerId: string
): Promise<{
  at_risk_count: number;
  worst_status: string | null;
  open_recommendations_count: number;
  upcoming_departure: { booking_id: string; reference_number: string; travel_date: string } | null;
}> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, reference_number, travel_date")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .in("status", ["draft", "confirmed"]);

  const ids = (bookings ?? []).map((b) => b.id);
  if (ids.length === 0) {
    return {
      at_risk_count: 0,
      worst_status: null,
      open_recommendations_count: 0,
      upcoming_departure: null,
    };
  }

  const { data: snaps } = await supabase
    .from("ai_ops_snapshots")
    .select("entity_id, operational_status, readiness_score")
    .eq("entity_type", "booking")
    .in("entity_id", ids);

  const statusRank: Record<string, number> = {
    critical: 4,
    at_risk: 3,
    attention_required: 2,
    healthy: 1,
  };

  let worst_status: string | null = null;
  let worstRank = 0;
  let at_risk_count = 0;

  for (const s of snaps ?? []) {
    const rank = statusRank[s.operational_status ?? "healthy"] ?? 0;
    if (["at_risk", "critical"].includes(s.operational_status ?? "")) at_risk_count += 1;
    if (rank > worstRank) {
      worstRank = rank;
      worst_status = s.operational_status ?? null;
    }
  }

  const recs = await fetchOpsRecommendations(supabase, {
    customerId,
    status: "open",
    limit: 100,
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings ?? [])
    .filter((b) => b.travel_date && b.travel_date >= today)
    .sort((a, b) => a.travel_date!.localeCompare(b.travel_date!))[0];

  return {
    at_risk_count,
    worst_status,
    open_recommendations_count: recs.length,
    upcoming_departure: upcoming
      ? {
          booking_id: upcoming.id,
          reference_number: upcoming.reference_number,
          travel_date: upcoming.travel_date!,
        }
      : null,
  };
}
