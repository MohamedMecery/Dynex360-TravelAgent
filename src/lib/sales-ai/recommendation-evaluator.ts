import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { SALES_RULE_VERSION } from "@/lib/sales-ai/types";
import type {
  SalesEntityType,
  SalesRecommendationPriority,
} from "@/lib/sales-ai/types";
import { getSalesScoreService } from "@/lib/sales-ai/sales-score-service";

interface RuleMatch {
  code: string;
  priority: SalesRecommendationPriority;
  title: string;
  description: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  expiresInHours?: number;
}

export class RecommendationEvaluator {
  constructor(private readonly admin: SupabaseClient) {}

  async evaluateForEvent(event: DomainEventRecord): Promise<void> {
    await getSalesScoreService(this.admin).processDomainEvent(event);

    const entityTargets = await this.resolveEntities(event);
    for (const target of entityTargets) {
      const matches = await this.evaluateRules(target.type, target.id, event);
      for (const match of matches) {
        await this.upsertRecommendation({
          tenantId: event.tenant_id,
          entityType: target.type,
          entityId: target.id,
          match,
          sourceEventId: event.id,
        });
      }
    }
  }

  private async resolveEntities(
    event: DomainEventRecord
  ): Promise<{ type: SalesEntityType; id: string }[]> {
    const targets: { type: SalesEntityType; id: string }[] = [];
    const add = (type: SalesEntityType, id?: string | null) => {
      if (id) targets.push({ type, id });
    };

    if (event.aggregate_type === "quotation") {
      const { data: q } = await this.admin
        .from("quotations")
        .select("opportunity_id, customer_id")
        .eq("id", event.aggregate_id)
        .maybeSingle();
      add("opportunity", q?.opportunity_id);
      add("customer", q?.customer_id ?? event.customer_id);
    }

    if (event.aggregate_type === "opportunity") {
      add("opportunity", event.aggregate_id);
    }

    if (event.customer_id) add("customer", event.customer_id);

    return targets;
  }

  private async evaluateRules(
    entityType: SalesEntityType,
    entityId: string,
    event: DomainEventRecord
  ): Promise<RuleMatch[]> {
    const matches: RuleMatch[] = [];

    if (entityType === "opportunity" || entityType === "customer") {
      const oppId =
        entityType === "opportunity"
          ? entityId
          : await this.primaryOpportunityForCustomer(entityId);
      if (!oppId) return matches;

      const quote = await this.latestQuotation(oppId);
      const paymentPending = quote
        ? await this.hasPendingPayment(quote.id)
        : false;

      if (event.event_type === "quotation.viewed" && quote?.status === "viewed") {
        matches.push({
          code: "quotation_viewed_follow_up",
          priority: "high",
          title: "Follow up on viewed quotation",
          description: "Customer viewed the quotation but has not responded yet.",
          action_type: "call",
          action_payload: { quotation_id: quote.id, opportunity_id: oppId },
          expiresInHours: 72,
        });
      }

      if (quote?.status === "accepted" && paymentPending) {
        matches.push({
          code: "payment_pending_reminder",
          priority: "critical",
          title: "Send payment reminder",
          description: "Quotation accepted but payment is still pending.",
          action_type: "payment_reminder",
          action_payload: { quotation_id: quote.id, opportunity_id: oppId },
          expiresInHours: 48,
        });
      }

      if (quote?.valid_until) {
        const daysLeft =
          (new Date(quote.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 3 && ["sent", "viewed"].includes(quote.status)) {
          matches.push({
            code: "quotation_expiring",
            priority: "high",
            title: "Quotation expiring soon",
            description: `Quotation expires in ${Math.ceil(daysLeft)} day(s).`,
            action_type: "quotation",
            action_payload: { quotation_id: quote.id },
            expiresInHours: Math.max(1, Math.ceil(daysLeft * 24)),
          });
        }
      }

      const { data: opp } = await this.admin
        .from("opportunities")
        .select("stage")
        .eq("id", oppId)
        .maybeSingle();

      if (opp?.stage === "verbal_approval" && (!quote || quote.status === "draft")) {
        matches.push({
          code: "verbal_approval_no_quote",
          priority: "high",
          title: "Create and send quotation",
          description: "Opportunity is at verbal approval but no quotation has been sent.",
          action_type: "quotation",
          action_payload: { opportunity_id: oppId },
          expiresInHours: 168,
        });
      }
    }

    if (entityType === "lead") {
      const { data: lead } = await this.admin
        .from("leads")
        .select("status, last_contacted_at, created_at")
        .eq("id", entityId)
        .maybeSingle();

      if (lead) {
        const last = lead.last_contacted_at ?? lead.created_at;
        const days =
          (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 1 && ["new", "contacted"].includes(lead.status)) {
          matches.push({
            code: "hot_lead_untouched",
            priority: days >= 3 ? "high" : "normal",
            title: "Contact hot lead",
            description: "Lead has not been contacted recently.",
            action_type: "call",
            action_payload: { lead_id: entityId },
            expiresInHours: 48,
          });
        }
      }
    }

    if (event.event_type === "payment.failed" && entityType !== "lead") {
      matches.push({
        code: "payment_failed_follow_up",
        priority: "critical",
        title: "Follow up on failed payment",
        description: "Customer payment attempt failed — contact to retry.",
        action_type: "call",
        action_payload: { event_type: event.event_type },
        expiresInHours: 24,
      });
    }

    return matches;
  }

  private async upsertRecommendation(input: {
    tenantId: string;
    entityType: SalesEntityType;
    entityId: string;
    match: RuleMatch;
    sourceEventId: string;
  }): Promise<void> {
    const idempotencyKey = `${input.match.code}:${input.entityType}:${input.entityId}`;
    const expiresAt = input.match.expiresInHours
      ? new Date(Date.now() + input.match.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await this.admin.from("ai_sales_recommendations").upsert(
      {
        tenant_id: input.tenantId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        recommendation_code: input.match.code,
        priority: input.match.priority,
        title: input.match.title,
        description: input.match.description,
        action_type: input.match.action_type,
        action_payload: input.match.action_payload,
        status: "open",
        source_event_id: input.sourceEventId,
        expires_at: expiresAt,
        rule_version: SALES_RULE_VERSION,
        idempotency_key: idempotencyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,idempotency_key", ignoreDuplicates: false }
    );

    if (error) throw new Error(error.message);
  }

  private async primaryOpportunityForCustomer(customerId: string): Promise<string | null> {
    const { data } = await this.admin
      .from("opportunities")
      .select("id")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .in("stage", ["discovery", "proposal", "negotiation", "verbal_approval"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  private async latestQuotation(opportunityId: string) {
    const { data } = await this.admin
      .from("quotations")
      .select("id, status, valid_until, accepted_at, viewed_at")
      .eq("opportunity_id", opportunityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  private async hasPendingPayment(quotationId: string): Promise<boolean> {
    const { count } = await this.admin
      .from("payment_orders")
      .select("id", { count: "exact", head: true })
      .eq("quotation_id", quotationId)
      .in("status", ["pending", "processing"]);
    return (count ?? 0) > 0;
  }
}
