import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { OPS_RULE_VERSION } from "@/lib/operations-ai/types";
import type { OpsRecommendationPriority } from "@/lib/operations-ai/types";
import { getOperationsScoreService } from "@/lib/operations-ai/operations-score-service";
import { resolveDocumentType } from "@/lib/operations-ai/scoring-rules";

interface RuleMatch {
  code: string;
  priority: OpsRecommendationPriority;
  title: string;
  description: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  expiresInHours?: number;
}

export class RecommendationEvaluator {
  constructor(private readonly admin: SupabaseClient) {}

  async evaluateForEvent(event: DomainEventRecord): Promise<void> {
    await getOperationsScoreService(this.admin).processDomainEvent(event);

    const bookingId = await this.resolveBookingId(event);
    if (!bookingId) return;

    const matches = await this.evaluateRules(event.tenant_id, bookingId, event);
    for (const match of matches) {
      await this.upsertRecommendation({
        tenantId: event.tenant_id,
        bookingId,
        match,
        sourceEventId: event.id,
      });
    }
  }

  private async resolveBookingId(event: DomainEventRecord): Promise<string | null> {
    if (event.aggregate_type === "booking") return event.aggregate_id;
    if (event.payload?.booking_id) return event.payload.booking_id as string;

    if (event.aggregate_type === "payment_order" || event.aggregate_type === "payment") {
      const { data } = await this.admin
        .from("payment_orders")
        .select("booking_id")
        .eq("id", event.aggregate_id)
        .maybeSingle();
      return data?.booking_id ?? null;
    }

    return null;
  }

  private async evaluateRules(
    tenantId: string,
    bookingId: string,
    event: DomainEventRecord
  ): Promise<RuleMatch[]> {
    const matches: RuleMatch[] = [];

    const { data: booking } = await this.admin
      .from("bookings")
      .select("id, status, payment_status, travel_date, reference_number")
      .eq("tenant_id", tenantId)
      .eq("id", bookingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!booking || !["draft", "confirmed"].includes(booking.status)) return matches;

    const daysToDeparture = booking.travel_date
      ? (new Date(booking.travel_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : null;

    if (
      booking.status === "confirmed" &&
      booking.payment_status !== "paid" &&
      daysToDeparture != null &&
      daysToDeparture <= 30
    ) {
      matches.push({
        code: "payment_gap_pre_departure",
        priority: daysToDeparture <= 7 ? "critical" : "high",
        title: "Collect payment before departure",
        description: `Booking ${booking.reference_number} is confirmed but unpaid with departure approaching.`,
        action_type: "payment_reminder",
        action_payload: { booking_id: bookingId },
        expiresInHours: 72,
      });
    }

    const { data: travelerLinks } = await this.admin
      .from("booking_travelers")
      .select("traveler_id")
      .eq("booking_id", bookingId);

    const travelerIds = (travelerLinks ?? []).map((l) => l.traveler_id);
    if (travelerIds.length > 0) {
      const { data: travelers } = await this.admin
        .from("travelers")
        .select("id, first_name, last_name, date_of_birth, nationality, passport_number, passport_expiry")
        .in("id", travelerIds)
        .is("deleted_at", null);

      for (const t of travelers ?? []) {
        const incomplete =
          !t.first_name || !t.last_name || !t.date_of_birth || !t.nationality;
        if (incomplete) {
          matches.push({
            code: "traveler_info_incomplete",
            priority: "normal",
            title: "Complete traveler profile",
            description: "Traveler is missing required identity fields.",
            action_type: "collect_traveler_info",
            action_payload: { booking_id: bookingId, traveler_id: t.id },
            expiresInHours: 168,
          });
        }

        const passportOk =
          t.passport_number &&
          (!booking.travel_date ||
            !t.passport_expiry ||
            new Date(t.passport_expiry) > new Date(booking.travel_date));

        if (!passportOk) {
          matches.push({
            code: "missing_passport",
            priority: "high",
            title: "Collect valid passport",
            description: "Traveler passport is missing or expires before travel.",
            action_type: "upload_document",
            action_payload: { booking_id: bookingId, traveler_id: t.id, document_type: "passport" },
            expiresInHours: 168,
          });
        }
      }
    }

    const { data: docs } = await this.admin
      .from("booking_documents")
      .select("document_type, file_name")
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId);

    const docTypes = new Set((docs ?? []).map((d) => resolveDocumentType(d)));
    const hasVoucher = docTypes.has("voucher") || docTypes.has("itinerary");

    if ((docs ?? []).length === 0 && daysToDeparture != null && daysToDeparture <= 30) {
      matches.push({
        code: "documents_incomplete",
        priority: "high",
        title: "Upload booking documents",
        description: "No documents on file with departure within 30 days.",
        action_type: "upload_document",
        action_payload: { booking_id: bookingId },
        expiresInHours: 168,
      });
    }

    if (!hasVoucher && daysToDeparture != null && daysToDeparture <= 14) {
      matches.push({
        code: "voucher_missing",
        priority: "high",
        title: "Issue travel voucher",
        description: "Departure is within 14 days and no voucher or itinerary is on file.",
        action_type: "upload_document",
        action_payload: { booking_id: bookingId, document_type: "voucher" },
        expiresInHours: 96,
      });
    }

    if (daysToDeparture != null && daysToDeparture <= 7 && daysToDeparture >= 0) {
      const { data: snap } = await this.admin
        .from("ai_ops_snapshots")
        .select("readiness_score")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "booking")
        .eq("entity_id", bookingId)
        .maybeSingle();

      if ((snap?.readiness_score ?? 100) < 80) {
        matches.push({
          code: "departure_7d_review",
          priority: "critical",
          title: "Pre-departure readiness review",
          description: "Departure within 7 days — readiness checklist is incomplete.",
          action_type: "review_booking",
          action_payload: { booking_id: bookingId },
          expiresInHours: 48,
        });
      }
    }

    if (event.event_type === "payment.failed") {
      matches.push({
        code: "payment_failed_ops_follow_up",
        priority: "critical",
        title: "Resolve failed payment",
        description: "Payment failed — verify booking readiness before departure.",
        action_type: "payment_reminder",
        action_payload: { booking_id: bookingId },
        expiresInHours: 24,
      });
    }

    return matches;
  }

  private async upsertRecommendation(input: {
    tenantId: string;
    bookingId: string;
    match: RuleMatch;
    sourceEventId: string;
  }): Promise<void> {
    const idempotencyKey = `${input.match.code}:booking:${input.bookingId}`;
    const expiresAt = input.match.expiresInHours
      ? new Date(Date.now() + input.match.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await this.admin.from("ai_ops_recommendations").upsert(
      {
        tenant_id: input.tenantId,
        entity_type: "booking",
        entity_id: input.bookingId,
        recommendation_code: input.match.code,
        priority: input.match.priority,
        title: input.match.title,
        description: input.match.description,
        action_type: input.match.action_type,
        action_payload: input.match.action_payload,
        status: "open",
        source_event_id: input.sourceEventId,
        expires_at: expiresAt,
        rule_version: OPS_RULE_VERSION,
        idempotency_key: idempotencyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,idempotency_key", ignoreDuplicates: false }
    );

    if (error) throw new Error(error.message);
  }
}
