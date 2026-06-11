import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchOpsRecommendations,
  fetchOpsSnapshot,
} from "@/lib/operations-ai/recommendation-service";

export interface OperationsAgentContext {
  snapshot: Record<string, unknown> | null;
  recommendations: Record<string, unknown>[];
  booking: Record<string, unknown> | null;
  travelers: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  citations: { type: string; id: string; label: string }[];
}

export async function buildOperationsAgentContext(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
  }
): Promise<OperationsAgentContext> {
  const citations: { type: string; id: string; label: string }[] = [];

  const snap = await fetchOpsSnapshot(supabase, "booking", input.bookingId);
  let snapshot = null;
  if (snap) {
    snapshot = {
      id: snap.id,
      health_score: snap.health_score,
      risk_score: snap.risk_score,
      readiness_score: snap.readiness_score,
      operational_status: snap.operational_status,
      confidence: snap.confidence,
      risk_indicators: snap.risk_indicators,
      readiness_checklist: snap.readiness_checklist,
      score_breakdown: snap.score_breakdown,
      computed_at: snap.computed_at,
      rule_version: snap.rule_version,
    };
    citations.push({
      type: "snapshot",
      id: snap.id,
      label: `Operations snapshot ${snap.rule_version}`,
    });
  }

  const recommendations = await fetchOpsRecommendations(supabase, {
    entityType: "booking",
    entityId: input.bookingId,
    limit: 5,
  });

  for (const rec of recommendations) {
    citations.push({ type: "recommendation", id: rec.id, label: rec.title });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, reference_number, status, payment_status, travel_date, total_amount, currency, notes"
    )
    .eq("id", input.bookingId)
    .maybeSingle();

  if (booking) {
    citations.push({
      type: "booking",
      id: booking.id,
      label: booking.reference_number,
    });
  }

  const { data: travelerLinks } = await supabase
    .from("booking_travelers")
    .select("traveler_id, is_lead")
    .eq("booking_id", input.bookingId);

  let travelers: Record<string, unknown>[] = [];
  const ids = (travelerLinks ?? []).map((l) => l.traveler_id);
  if (ids.length > 0) {
    const { data: tRows } = await supabase
      .from("travelers")
      .select(
        "id, first_name, last_name, date_of_birth, nationality, passport_number, passport_expiry"
      )
      .in("id", ids)
      .is("deleted_at", null);

    travelers = (tRows ?? []).map((t) => ({
      id: t.id,
      name: `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim(),
      has_passport: Boolean(t.passport_number),
      passport_expiry: t.passport_expiry,
      profile_complete: Boolean(
        t.first_name && t.last_name && t.date_of_birth && t.nationality
      ),
    }));
  }

  const { data: docs } = await supabase
    .from("booking_documents")
    .select("id, file_name, document_type, created_at")
    .eq("booking_id", input.bookingId);

  const documents = (docs ?? []).map((d) => ({
    id: d.id,
    file_name: d.file_name,
    document_type: d.document_type,
  }));

  return {
    snapshot,
    recommendations: recommendations.map((r) => ({
      id: r.id,
      code: r.recommendation_code,
      title: r.title,
      description: r.description,
      priority: r.priority,
      action_type: r.action_type,
    })),
    booking: booking as Record<string, unknown> | null,
    travelers,
    documents,
    citations,
  };
}

export function formatOperationsContextForPrompt(ctx: OperationsAgentContext): string {
  return JSON.stringify(
    {
      snapshot: ctx.snapshot,
      recommendations: ctx.recommendations,
      booking: ctx.booking,
      travelers: ctx.travelers,
      documents: ctx.documents,
    },
    null,
    2
  );
}
