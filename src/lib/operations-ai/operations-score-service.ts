import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clampScore,
  computeOpsConfidence,
  hashInputs,
  buildOpsRiskIndicators,
  operationalStatusFromScores,
  readinessFromChecklist,
  resolveDocumentType,
} from "@/lib/operations-ai/scoring-rules";
import type {
  OpsEntityType,
  OpsOperationalStatus,
  OpsReadinessItem,
  OpsRiskIndicator,
  OpsSnapshotRecord,
} from "@/lib/operations-ai/types";
import { OPS_RULE_VERSION } from "@/lib/operations-ai/types";

const ACTIVE_STATUSES = ["draft", "confirmed"];

interface BookingRow {
  id: string;
  status: string;
  payment_status: string;
  travel_date: string | null;
  reference_number: string;
}

interface TravelerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
}

interface DocumentRow {
  document_type?: string | null;
  file_name: string | null;
}

export class OperationsScoreService {
  constructor(private readonly admin: SupabaseClient) {}

  async processDomainEvent(event: DomainEventRecord): Promise<void> {
    const bookingId = await this.resolveBookingIdFromEvent(event);
    if (bookingId) {
      await this.computeSnapshot(event.tenant_id, "booking", bookingId, event.id);
    }
  }

  async computeSnapshot(
    tenantId: string,
    entityType: OpsEntityType,
    entityId: string,
    triggerEventId?: string
  ): Promise<OpsSnapshotRecord | null> {
    if (entityType !== "booking") return null;
    return this.computeBookingSnapshot(tenantId, entityId, triggerEventId);
  }

  private async resolveBookingIdFromEvent(event: DomainEventRecord): Promise<string | null> {
    if (event.aggregate_type === "booking") return event.aggregate_id;

    if (event.aggregate_type === "payment_order" || event.aggregate_type === "payment") {
      const bookingId =
        (event.payload?.booking_id as string | undefined) ??
        (await this.getBookingIdFromPayment(event.aggregate_id));
      return bookingId;
    }

    return null;
  }

  private async getBookingIdFromPayment(paymentOrderId: string): Promise<string | null> {
    const { data } = await this.admin
      .from("payment_orders")
      .select("booking_id")
      .eq("id", paymentOrderId)
      .maybeSingle();
    return data?.booking_id ?? null;
  }

  private async computeBookingSnapshot(
    tenantId: string,
    bookingId: string,
    triggerEventId?: string
  ): Promise<OpsSnapshotRecord | null> {
    const { data: booking, error } = await this.admin
      .from("bookings")
      .select("id, status, payment_status, travel_date, reference_number")
      .eq("tenant_id", tenantId)
      .eq("id", bookingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!booking) return null;

    const row = booking as BookingRow;
    if (!ACTIVE_STATUSES.includes(row.status)) {
      await this.deleteSnapshot(tenantId, "booking", bookingId);
      return null;
    }

    const daysToDeparture = row.travel_date
      ? (new Date(row.travel_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : null;

    if (daysToDeparture != null && daysToDeparture < -7) {
      await this.deleteSnapshot(tenantId, "booking", bookingId);
      return null;
    }

    const expectedPax = await this.expectedPax(tenantId, bookingId);
    const travelers = await this.loadTravelers(bookingId);
    const documents = await this.loadDocuments(tenantId, bookingId);

    const docTypes = new Set(documents.map((d) => resolveDocumentType(d)));
    const hasVoucher = docTypes.has("voucher") || docTypes.has("itinerary");

    let incompleteTravelers = 0;
    let missingPassports = 0;
    for (const t of travelers) {
      const profileComplete =
        Boolean(t.first_name && t.last_name && t.date_of_birth && t.nationality);
      if (!profileComplete) incompleteTravelers += 1;

      const passportOk =
        Boolean(t.passport_number) &&
        (!row.travel_date ||
          !t.passport_expiry ||
          new Date(t.passport_expiry) > new Date(row.travel_date));
      if (!passportOk) missingPassports += 1;
    }

    const travelerCount = travelers.length;
    const travelersComplete = travelerCount >= expectedPax && incompleteTravelers === 0;
    const paymentCollected =
      row.payment_status === "paid" ||
      (row.status === "draft" && row.payment_status === "partial");

    const checklist: OpsReadinessItem[] = [
      {
        code: "payment_collected",
        label: "Payment collected",
        complete: paymentCollected,
      },
      {
        code: "travelers_complete",
        label: "Traveler profiles complete",
        complete: travelersComplete,
        evidence: { expected: expectedPax, actual: travelerCount },
      },
      {
        code: "passports_valid",
        label: "Passports valid for travel",
        complete: missingPassports === 0 && travelerCount > 0,
        evidence: { missing: missingPassports },
      },
      {
        code: "documents_uploaded",
        label: "Core documents uploaded",
        complete: documents.length > 0,
        evidence: { count: documents.length },
      },
      {
        code: "voucher_issued",
        label: "Voucher or itinerary on file",
        complete: hasVoucher,
      },
    ];

    const readinessScore = readinessFromChecklist(checklist);

    let healthScore = 100;
    const breakdown: Record<string, number> = {};

    if (row.status === "confirmed" && row.payment_status !== "paid") {
      breakdown.payment = -30;
      healthScore -= 30;
    }

    if (travelerCount < expectedPax) {
      const gap = expectedPax - travelerCount;
      breakdown.missing_travelers = -15 * gap;
      healthScore -= 15 * gap;
    }

    if (missingPassports > 0) {
      breakdown.passports = -10 * missingPassports;
      healthScore -= 10 * missingPassports;
    }

    if (
      daysToDeparture != null &&
      daysToDeparture <= 30 &&
      documents.length === 0
    ) {
      breakdown.documents = -20;
      healthScore -= 20;
    }

    healthScore = clampScore(healthScore);

    let riskScore = 0;
    const paymentGap =
      row.status === "confirmed" &&
      row.payment_status !== "paid" &&
      daysToDeparture != null &&
      daysToDeparture <= 30;

    if (paymentGap) {
      breakdown.risk_payment = 40;
      riskScore += 40;
    }

    if (daysToDeparture != null && daysToDeparture <= 7 && readinessScore < 70) {
      breakdown.risk_departure = 30;
      riskScore += 30;
    }

    if (missingPassports > 0) {
      breakdown.risk_passport = 25 * missingPassports;
      riskScore += 25 * missingPassports;
    }

    if (!hasVoucher && daysToDeparture != null && daysToDeparture <= 14) {
      breakdown.risk_voucher = 20;
      riskScore += 20;
    }

    riskScore = clampScore(riskScore);

    const riskIndicators = buildOpsRiskIndicators({
      paymentGap,
      daysToDeparture,
      missingPassports,
      missingVoucher: !hasVoucher,
      incompleteTravelers,
    });

    const operationalStatus = operationalStatusFromScores({
      riskScore,
      readinessScore,
      daysToDeparture,
    });

    const confidence = computeOpsConfidence({
      hasTravelDate: Boolean(row.travel_date),
      hasTravelers: travelerCount > 0,
      hasDocuments: documents.length > 0,
      hasPaymentContext: row.payment_status !== "unpaid",
      hasItems: expectedPax > 0,
    });

    const inputsHash = hashInputs({
      status: row.status,
      payment_status: row.payment_status,
      travel_date: row.travel_date,
      expectedPax,
      travelerCount,
      missingPassports,
      hasVoucher,
      documentCount: documents.length,
    });

    return this.persistSnapshot({
      tenantId,
      entityType: "booking",
      entityId: bookingId,
      healthScore,
      riskScore,
      readinessScore,
      operationalStatus,
      confidence,
      riskIndicators,
      readinessChecklist: checklist,
      breakdown,
      inputsHash,
      triggerEventId,
    });
  }

  private async expectedPax(tenantId: string, bookingId: string): Promise<number> {
    const { data: items } = await this.admin
      .from("booking_items")
      .select("quantity")
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId);

    const itemSum = (items ?? []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    const { count } = await this.admin
      .from("booking_travelers")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId);

    return Math.max(itemSum, count ?? 0, 1);
  }

  private async loadTravelers(bookingId: string): Promise<TravelerRow[]> {
    const { data: links } = await this.admin
      .from("booking_travelers")
      .select("traveler_id")
      .eq("booking_id", bookingId);

    const ids = (links ?? []).map((l) => l.traveler_id).filter(Boolean);
    if (ids.length === 0) return [];

    const { data } = await this.admin
      .from("travelers")
      .select(
        "id, first_name, last_name, date_of_birth, nationality, passport_number, passport_expiry"
      )
      .in("id", ids)
      .is("deleted_at", null);

    return (data ?? []) as TravelerRow[];
  }

  private async loadDocuments(
    tenantId: string,
    bookingId: string
  ): Promise<DocumentRow[]> {
    const { data } = await this.admin
      .from("booking_documents")
      .select("document_type, file_name")
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId);

    return (data ?? []) as DocumentRow[];
  }

  private async persistSnapshot(input: {
    tenantId: string;
    entityType: OpsEntityType;
    entityId: string;
    healthScore: number;
    riskScore: number;
    readinessScore: number;
    operationalStatus: OpsOperationalStatus;
    confidence: number;
    riskIndicators: OpsRiskIndicator[];
    readinessChecklist: OpsReadinessItem[];
    breakdown: Record<string, number>;
    inputsHash: string;
    triggerEventId?: string;
  }): Promise<OpsSnapshotRecord> {
    const now = new Date().toISOString();

    const { data: existing } = await this.admin
      .from("ai_ops_snapshots")
      .select("id, inputs_hash")
      .eq("tenant_id", input.tenantId)
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .maybeSingle();

    if (existing?.inputs_hash === input.inputsHash) {
      const { data: snap } = await this.admin
        .from("ai_ops_snapshots")
        .select("*")
        .eq("id", existing.id)
        .single();
      return snap as OpsSnapshotRecord;
    }

    const row = {
      tenant_id: input.tenantId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      health_score: input.healthScore,
      risk_score: input.riskScore,
      readiness_score: input.readinessScore,
      operational_status: input.operationalStatus,
      confidence: input.confidence,
      risk_indicators: input.riskIndicators,
      readiness_checklist: input.readinessChecklist,
      score_breakdown: input.breakdown,
      rule_version: OPS_RULE_VERSION,
      inputs_hash: input.inputsHash,
      computed_at: now,
      updated_at: now,
    };

    let snapshotId: string;
    if (existing?.id) {
      const { data, error } = await this.admin
        .from("ai_ops_snapshots")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      snapshotId = data.id;
    } else {
      const { data, error } = await this.admin
        .from("ai_ops_snapshots")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      snapshotId = data.id;
    }

    await this.admin.from("ai_ops_score_history").insert({
      tenant_id: input.tenantId,
      snapshot_id: snapshotId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      health_score: input.healthScore,
      risk_score: input.riskScore,
      readiness_score: input.readinessScore,
      operational_status: input.operationalStatus,
      confidence: input.confidence,
      risk_indicators: input.riskIndicators,
      readiness_checklist: input.readinessChecklist,
      score_breakdown: input.breakdown,
      rule_version: OPS_RULE_VERSION,
      inputs_hash: input.inputsHash,
      trigger_event_id: input.triggerEventId ?? null,
      computed_at: now,
    });

    const { data: final } = await this.admin
      .from("ai_ops_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    return final as OpsSnapshotRecord;
  }

  private async deleteSnapshot(
    tenantId: string,
    entityType: OpsEntityType,
    entityId: string
  ): Promise<void> {
    await this.admin
      .from("ai_ops_snapshots")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
  }
}

let defaultService: OperationsScoreService | null = null;

export function getOperationsScoreService(
  admin?: SupabaseClient
): OperationsScoreService {
  if (admin) return new OperationsScoreService(admin);
  if (!defaultService) {
    defaultService = new OperationsScoreService(createAdminClient());
  }
  return defaultService;
}
