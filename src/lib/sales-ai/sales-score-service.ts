import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STAGE_PRIORS,
  QUOTATION_STATUS_FACTOR,
  clampScore,
  tierFromPriorityScore,
  computeConfidence,
  hashInputs,
  buildRiskIndicators,
} from "@/lib/sales-ai/scoring-rules";
import type {
  SalesEntityType,
  SalesPriorityTier,
  SalesRiskIndicator,
  SalesSnapshotRecord,
} from "@/lib/sales-ai/types";
import { SALES_RULE_VERSION } from "@/lib/sales-ai/types";

const OPEN_STAGES = ["discovery", "proposal", "negotiation", "verbal_approval"];
const OPEN_LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation"];

interface LeadRow {
  id: string;
  status: string;
  source: string;
  travel_date: string | null;
  last_contacted_at: string | null;
  created_at: string;
  customer_id: string | null;
}

interface OpportunityRow {
  id: string;
  stage: string;
  expected_close_date: string | null;
  customer_id: string | null;
  lead_id: string | null;
}

interface QuotationRow {
  id: string;
  status: string;
  valid_until: string | null;
}

export class SalesScoreService {
  constructor(private readonly admin: SupabaseClient) {}

  async processDomainEvent(event: DomainEventRecord): Promise<void> {
    const targets = await this.resolveTargetsFromEvent(event);
    for (const target of targets) {
      await this.computeSnapshot(event.tenant_id, target.type, target.id, event.id);
    }
  }

  async computeSnapshot(
    tenantId: string,
    entityType: SalesEntityType,
    entityId: string,
    triggerEventId?: string
  ): Promise<SalesSnapshotRecord | null> {
    if (entityType === "lead") {
      return this.computeLeadSnapshot(tenantId, entityId, triggerEventId);
    }
    if (entityType === "opportunity") {
      return this.computeOpportunitySnapshot(tenantId, entityId, triggerEventId);
    }
    if (entityType === "customer") {
      return this.computeCustomerSnapshot(tenantId, entityId, triggerEventId);
    }
    return null;
  }

  private async resolveTargetsFromEvent(
    event: DomainEventRecord
  ): Promise<{ type: SalesEntityType; id: string }[]> {
    const targets: { type: SalesEntityType; id: string }[] = [];
    const seen = new Set<string>();

    const add = (type: SalesEntityType, id: string | null | undefined) => {
      if (!id) return;
      const key = `${type}:${id}`;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push({ type, id });
    };

    if (event.customer_id) add("customer", event.customer_id);

    if (event.aggregate_type === "quotation") {
      const oppId = await this.getQuotationOpportunityId(event.aggregate_id);
      add("opportunity", oppId);
      if (oppId) add("lead", await this.getOpportunityLeadId(oppId));
    }

    if (event.aggregate_type === "opportunity") {
      add("opportunity", event.aggregate_id);
      add("lead", await this.getOpportunityLeadId(event.aggregate_id));
    }

    if (event.aggregate_type === "booking" || event.aggregate_type === "payment_order") {
      add("customer", event.customer_id ?? (event.payload?.customer_id as string | undefined));
      const quotationId = event.payload?.quotation_id as string | undefined;
      if (quotationId) {
        const oppId = await this.getQuotationOpportunityId(quotationId);
        add("opportunity", oppId);
      }
    }

    return targets;
  }

  private async computeLeadSnapshot(
    tenantId: string,
    leadId: string,
    triggerEventId?: string
  ): Promise<SalesSnapshotRecord | null> {
    const { data: lead, error } = await this.admin
      .from("leads")
      .select(
        "id, status, source, travel_date, last_contacted_at, created_at, customer_id"
      )
      .eq("tenant_id", tenantId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!lead) return null;

    const row = lead as LeadRow;
    if (!OPEN_LEAD_STATUSES.includes(row.status)) {
      await this.deleteSnapshot(tenantId, "lead", leadId);
      return null;
    }

    let score = 0;
    const breakdown: Record<string, number> = {};

    const ageHours =
      (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      breakdown.lead_age_24h = 15;
      score += 15;
    }

    if (["referral", "walk_in"].includes(row.source)) {
      breakdown.source = 10;
      score += 10;
    }

    if (row.travel_date) {
      const daysToTravel =
        (new Date(row.travel_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToTravel > 0 && daysToTravel <= 60) {
        breakdown.travel_soon = 15;
        score += 15;
      }
    }

    if (["qualified", "proposal_sent"].includes(row.status)) {
      breakdown.status = 15;
      score += 15;
    }

    const lastContact = row.last_contacted_at
      ? new Date(row.last_contacted_at)
      : new Date(row.created_at);
    const daysSinceContact =
      (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact >= 7) {
      breakdown.stale = -20;
      score -= 20;
    }

    const priorityScore = clampScore(score);
    const priorityTier = tierFromPriorityScore(priorityScore);
    const confidence = computeConfidence({
      hasQuotation: false,
      hasRecentActivity: daysSinceContact < 7,
      hasCustomerLink: Boolean(row.customer_id),
      hasDomainEvents30d: false,
      hasPaymentContext: false,
    });

    return this.persistSnapshot({
      tenantId,
      entityType: "lead",
      entityId: leadId,
      healthScore: null,
      priorityScore,
      winProbability: null,
      priorityTier,
      confidence,
      riskIndicators:
        daysSinceContact >= 7
          ? [{ code: "no_contact", severity: "medium", label: "No contact in 7+ days" }]
          : [],
      breakdown,
      inputs: { status: row.status, source: row.source, daysSinceContact, priorityScore },
      triggerEventId,
    });
  }

  private async computeOpportunitySnapshot(
    tenantId: string,
    opportunityId: string,
    triggerEventId?: string
  ): Promise<SalesSnapshotRecord | null> {
    const { data: opp, error } = await this.admin
      .from("opportunities")
      .select("id, stage, expected_close_date, customer_id, lead_id")
      .eq("tenant_id", tenantId)
      .eq("id", opportunityId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!opp) return null;

    const row = opp as OpportunityRow;
    if (!OPEN_STAGES.includes(row.stage)) {
      await this.deleteSnapshot(tenantId, "opportunity", opportunityId);
      return null;
    }

    const latestQuote = await this.getLatestQuotation(tenantId, opportunityId);
    const paymentPending = await this.hasPendingPayment(tenantId, latestQuote?.id);
    const daysSinceStage = await this.daysSinceLastStageChange(opportunityId);
    const daysSinceCustomerSignal = await this.daysSinceCustomerSignal(
      tenantId,
      row.customer_id,
      opportunityId
    );

    const stagePrior = STAGE_PRIORS[row.stage] ?? 20;
    const quoteFactor = latestQuote
      ? QUOTATION_STATUS_FACTOR[latestQuote.status] ?? 10
      : 10;
    const engagementFactor =
      daysSinceCustomerSignal == null || daysSinceCustomerSignal < 7 ? 80 : 30;
    const paymentFactor = paymentPending
      ? 20
      : latestQuote?.status === "converted_to_booking"
        ? 100
        : 50;

    const winProbability = clampScore(
      0.4 * stagePrior +
        0.25 * quoteFactor +
        0.2 * engagementFactor +
        0.1 * paymentFactor +
        0.05 * 50
    );

    const breakdown: Record<string, number> = {
      stage_momentum: clampScore(Math.max(0, 100 - daysSinceStage * 8)),
      quotation: quoteFactor,
      engagement: engagementFactor,
      payment: paymentFactor,
      timeline: row.expected_close_date ? 70 : 40,
    };

    const healthScore = clampScore(
      breakdown.stage_momentum * 0.25 +
        breakdown.quotation * 0.25 +
        breakdown.engagement * 0.2 +
        breakdown.payment * 0.15 +
        breakdown.timeline * 0.15
    );

    const riskIndicators = buildRiskIndicators({
      quotationValidUntil: latestQuote?.valid_until ?? null,
      quotationStatus: latestQuote?.status ?? null,
      paymentPending,
      daysSinceCustomerSignal,
      expectedCloseDate: row.expected_close_date,
      stage: row.stage,
    });

    const confidence = computeConfidence({
      hasQuotation: Boolean(latestQuote),
      hasRecentActivity: daysSinceCustomerSignal == null || daysSinceCustomerSignal < 7,
      hasCustomerLink: Boolean(row.customer_id),
      hasDomainEvents30d: daysSinceCustomerSignal != null && daysSinceCustomerSignal < 30,
      hasPaymentContext:
        paymentPending || latestQuote?.status === "converted_to_booking",
    });

    return this.persistSnapshot({
      tenantId,
      entityType: "opportunity",
      entityId: opportunityId,
      healthScore,
      priorityScore: null,
      winProbability,
      priorityTier: null,
      confidence,
      riskIndicators,
      breakdown,
      inputs: { stage: row.stage, quoteStatus: latestQuote?.status, healthScore, winProbability },
      triggerEventId,
    });
  }

  private async computeCustomerSnapshot(
    tenantId: string,
    customerId: string,
    triggerEventId?: string
  ): Promise<SalesSnapshotRecord | null> {
    const { data: openOpps } = await this.admin
      .from("opportunities")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .in("stage", OPEN_STAGES)
      .limit(1);

    if (!openOpps?.length) {
      await this.deleteSnapshot(tenantId, "customer", customerId);
      return null;
    }

    const oppSnapshot = await this.computeOpportunitySnapshot(
      tenantId,
      openOpps[0].id,
      triggerEventId
    );
    if (!oppSnapshot) return null;

    return this.persistSnapshot({
      tenantId,
      entityType: "customer",
      entityId: customerId,
      healthScore: oppSnapshot.health_score,
      priorityScore: oppSnapshot.priority_score,
      winProbability: oppSnapshot.win_probability,
      priorityTier: oppSnapshot.priority_tier,
      confidence: oppSnapshot.confidence,
      riskIndicators: oppSnapshot.risk_indicators,
      breakdown: {
        ...oppSnapshot.score_breakdown,
        derived_from_opportunity: openOpps[0].id,
      },
      inputs: { customer_id: customerId, primary_opportunity_id: openOpps[0].id },
      triggerEventId,
    });
  }

  private async persistSnapshot(input: {
    tenantId: string;
    entityType: SalesEntityType;
    entityId: string;
    healthScore: number | null;
    priorityScore: number | null;
    winProbability: number | null;
    priorityTier: SalesPriorityTier | null;
    confidence: number;
    riskIndicators: SalesRiskIndicator[];
    breakdown: Record<string, unknown>;
    inputs: Record<string, unknown>;
    triggerEventId?: string;
  }): Promise<SalesSnapshotRecord> {
    const inputsHash = hashInputs(input.inputs);
    const now = new Date().toISOString();

    const { data: existing } = await this.admin
      .from("ai_sales_snapshots")
      .select("id, inputs_hash")
      .eq("tenant_id", input.tenantId)
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .maybeSingle();

    const row = {
      tenant_id: input.tenantId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      health_score: input.healthScore,
      priority_score: input.priorityScore,
      win_probability: input.winProbability,
      priority_tier: input.priorityTier,
      confidence: input.confidence,
      risk_indicators: input.riskIndicators,
      score_breakdown: input.breakdown,
      rule_version: SALES_RULE_VERSION,
      inputs_hash: inputsHash,
      computed_at: now,
      updated_at: now,
    };

    let snapshotId: string;

    if (existing?.id) {
      if (existing.inputs_hash === inputsHash) {
        const { data: snap } = await this.admin
          .from("ai_sales_snapshots")
          .select("*")
          .eq("id", existing.id)
          .single();
        return snap as SalesSnapshotRecord;
      }
      const { data, error } = await this.admin
        .from("ai_sales_snapshots")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      snapshotId = data.id;
    } else {
      const { data, error } = await this.admin
        .from("ai_sales_snapshots")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      snapshotId = data.id;
    }

    await this.admin.from("ai_sales_score_history").insert({
      tenant_id: input.tenantId,
      snapshot_id: snapshotId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      health_score: input.healthScore,
      priority_score: input.priorityScore,
      win_probability: input.winProbability,
      priority_tier: input.priorityTier,
      confidence: input.confidence,
      risk_indicators: input.riskIndicators,
      score_breakdown: input.breakdown,
      rule_version: SALES_RULE_VERSION,
      inputs_hash: inputsHash,
      trigger_event_id: input.triggerEventId ?? null,
      computed_at: now,
    });

    const { data: final } = await this.admin
      .from("ai_sales_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    return final as SalesSnapshotRecord;
  }

  private async deleteSnapshot(
    tenantId: string,
    entityType: SalesEntityType,
    entityId: string
  ): Promise<void> {
    await this.admin
      .from("ai_sales_snapshots")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
  }

  private async getQuotationOpportunityId(quotationId: string): Promise<string | null> {
    const { data } = await this.admin
      .from("quotations")
      .select("opportunity_id")
      .eq("id", quotationId)
      .maybeSingle();
    return data?.opportunity_id ?? null;
  }

  private async getOpportunityLeadId(opportunityId: string): Promise<string | null> {
    const { data } = await this.admin
      .from("opportunities")
      .select("lead_id")
      .eq("id", opportunityId)
      .maybeSingle();
    return data?.lead_id ?? null;
  }

  private async getLatestQuotation(
    tenantId: string,
    opportunityId: string
  ): Promise<QuotationRow | null> {
    const { data } = await this.admin
      .from("quotations")
      .select("id, status, valid_until")
      .eq("tenant_id", tenantId)
      .eq("opportunity_id", opportunityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as QuotationRow | null) ?? null;
  }

  private async hasPendingPayment(
    tenantId: string,
    quotationId?: string | null
  ): Promise<boolean> {
    if (!quotationId) return false;
    const { count } = await this.admin
      .from("payment_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("quotation_id", quotationId)
      .in("status", ["pending", "processing"]);
    return (count ?? 0) > 0;
  }

  private async daysSinceLastStageChange(opportunityId: string): Promise<number> {
    const { data } = await this.admin
      .from("opportunity_stage_history")
      .select("changed_at")
      .eq("opportunity_id", opportunityId)
      .order("changed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ref = data?.changed_at ? new Date(data.changed_at) : new Date();
    return (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
  }

  private async daysSinceCustomerSignal(
    tenantId: string,
    customerId: string | null,
    opportunityId: string
  ): Promise<number | null> {
    if (!customerId) return null;
    const { data } = await this.admin
      .from("domain_events")
      .select("occurred_at")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.occurred_at) {
      return (Date.now() - new Date(data.occurred_at).getTime()) / (1000 * 60 * 60 * 24);
    }
    const { data: act } = await this.admin
      .from("activities")
      .select("completed_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("related_opportunity_id", opportunityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ref = act?.completed_at ?? act?.created_at;
    return ref ? (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24) : null;
  }
}

let defaultService: SalesScoreService | null = null;

export function getSalesScoreService(admin?: SupabaseClient): SalesScoreService {
  if (admin) return new SalesScoreService(admin);
  if (!defaultService) {
    defaultService = new SalesScoreService(createAdminClient());
  }
  return defaultService;
}
