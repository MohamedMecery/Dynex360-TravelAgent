import type { SupabaseClient } from "@supabase/supabase-js";
import {
  acceptQuotation,
  rejectQuotation,
  markQuotationViewed,
} from "@/lib/crm/quotations-service";
import { QuotationTransitionError } from "@/lib/crm/quotation-lifecycle";
import type { PortalApiContext } from "@/lib/auth/require-portal-api-access";
import { PORTAL_ACTIONABLE_QUOTATION_STATUSES } from "@/lib/portal/constants";
import { logPortalCustomerAudit } from "@/lib/portal/portal-audit-service";
import {
  getPortalQuotationById,
  type PortalQuotationDetail,
} from "@/lib/portal/portal-quotations-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitAndDispatch } from "@/lib/events/dispatch-event";
import { DOMAIN_EVENT_TYPE, buildIdempotencyKey } from "@/lib/events/types";
import type { Quotation, QuotationStatus } from "@/types";

export class PortalQuotationActionError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function assertActionable(quotation: Quotation): void {
  if (quotation.status === "accepted" || quotation.status === "converted_to_booking") {
    throw new PortalQuotationActionError(
      "QUOTATION_ALREADY_ACCEPTED",
      "Quotation has already been accepted",
      409
    );
  }
  if (quotation.status === "rejected") {
    throw new PortalQuotationActionError(
      "QUOTATION_ALREADY_REJECTED",
      "Quotation has already been rejected",
      409
    );
  }
  if (quotation.status === "expired") {
    throw new PortalQuotationActionError(
      "QUOTATION_EXPIRED",
      "Quotation has expired",
      422
    );
  }
  if (
    !PORTAL_ACTIONABLE_QUOTATION_STATUSES.includes(
      quotation.status as (typeof PORTAL_ACTIONABLE_QUOTATION_STATUSES)[number]
    )
  ) {
    throw new PortalQuotationActionError(
      "QUOTATION_NOT_ACTIONABLE",
      "Quotation is not eligible for this action",
      422
    );
  }
}

async function loadOwnedQuotation(
  ctx: PortalApiContext,
  quotationId: string
): Promise<PortalQuotationDetail> {
  try {
    return await getPortalQuotationById(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      quotationId
    );
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "NOT_FOUND") {
      throw new PortalQuotationActionError("NOT_FOUND", "Quotation not found", 404);
    }
    throw err;
  }
}

async function prepareForAction(
  ctx: PortalApiContext,
  quotationId: string
): Promise<PortalQuotationDetail> {
  const quotation = await loadOwnedQuotation(ctx, quotationId);

  if (quotation.status === "sent") {
    const admin = createAdminClient();
    await markQuotationViewed(admin, ctx.tenantId, quotationId);
    return loadOwnedQuotation(ctx, quotationId);
  }

  return quotation;
}

function mapTransitionError(err: unknown): never {
  if (err instanceof QuotationTransitionError) {
    const status =
      err.code === "QUOTATION_EXPIRED"
        ? 422
        : err.code === "ACTIVE_QUOTATION_EXISTS"
          ? 409
          : 422;
    throw new PortalQuotationActionError(err.code, err.message, status);
  }
  throw err;
}

async function loadQuotationOwnerId(
  admin: SupabaseClient,
  tenantId: string,
  quotationId: string
): Promise<string | null> {
  const { data } = await admin
    .from("quotations")
    .select("owner_id, quotation_number")
    .eq("id", quotationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.owner_id as string | null) ?? null;
}

export async function portalAcceptQuotation(
  ctx: PortalApiContext,
  quotationId: string
): Promise<Quotation> {
  const before = await prepareForAction(ctx, quotationId);
  assertActionable(before);

  const admin = createAdminClient();
  let updated: Quotation;
  try {
    updated = await acceptQuotation(admin, ctx.tenantId, quotationId);
  } catch (err) {
    mapTransitionError(err);
  }

  await logPortalCustomerAudit({
    tenantId: ctx.tenantId,
    customerId: ctx.customerId,
    portalAccountId: ctx.accountId,
    tableName: "quotations",
    recordId: quotationId,
    eventName: "quotation_accepted",
    oldData: {
      status: before.status,
      quotation_id: quotationId,
      customer_id: ctx.customerId,
    },
    newData: {
      status: updated.status as QuotationStatus,
      quotation_id: quotationId,
      customer_id: ctx.customerId,
      accepted_at: updated.accepted_at,
    },
  });

  const ownerId = await loadQuotationOwnerId(admin, ctx.tenantId, quotationId);
  const acceptedAt = updated.accepted_at ?? new Date().toISOString();

  try {
    await emitAndDispatch({
      tenantId: ctx.tenantId,
      eventType: DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
      aggregateType: "quotation",
      aggregateId: quotationId,
      customerId: ctx.customerId,
      actorType: "customer",
      actorCustomerId: ctx.customerId,
      actorPortalAccountId: ctx.accountId,
      payload: {
        quotation_number: before.quotation_number,
        recipient_email: ctx.email,
        owner_id: ownerId,
        accepted_at: acceptedAt,
      },
      idempotencyKey: buildIdempotencyKey(
        DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
        ctx.tenantId,
        "quotation",
        quotationId,
        acceptedAt
      ),
      occurredAt: acceptedAt,
    });
  } catch (e) {
    console.error("quotation.accepted event dispatch failed:", e);
  }

  return updated;
}

export async function portalRejectQuotation(
  ctx: PortalApiContext,
  quotationId: string,
  reason?: string
): Promise<Quotation> {
  const before = await prepareForAction(ctx, quotationId);
  assertActionable(before);

  const admin = createAdminClient();
  let updated: Quotation;
  try {
    updated = await rejectQuotation(admin, ctx.tenantId, quotationId, reason);
  } catch (err) {
    mapTransitionError(err);
  }

  await logPortalCustomerAudit({
    tenantId: ctx.tenantId,
    customerId: ctx.customerId,
    portalAccountId: ctx.accountId,
    tableName: "quotations",
    recordId: quotationId,
    eventName: "quotation_rejected",
    oldData: {
      status: before.status,
      quotation_id: quotationId,
      customer_id: ctx.customerId,
    },
    newData: {
      status: updated.status as QuotationStatus,
      quotation_id: quotationId,
      customer_id: ctx.customerId,
      rejected_at: updated.rejected_at,
      rejection_reason: updated.rejection_reason ?? null,
    },
  });

  const ownerId = await loadQuotationOwnerId(admin, ctx.tenantId, quotationId);
  const rejectedAt = updated.rejected_at ?? new Date().toISOString();

  try {
    await emitAndDispatch({
      tenantId: ctx.tenantId,
      eventType: DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
      aggregateType: "quotation",
      aggregateId: quotationId,
      customerId: ctx.customerId,
      actorType: "customer",
      actorCustomerId: ctx.customerId,
      actorPortalAccountId: ctx.accountId,
      payload: {
        quotation_number: before.quotation_number,
        recipient_email: ctx.email,
        rejection_reason: reason ?? updated.rejection_reason ?? null,
        owner_id: ownerId,
        rejected_at: rejectedAt,
      },
      idempotencyKey: buildIdempotencyKey(
        DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
        ctx.tenantId,
        "quotation",
        quotationId,
        rejectedAt
      ),
      occurredAt: rejectedAt,
    });
  } catch (e) {
    console.error("quotation.rejected event dispatch failed:", e);
  }

  return updated;
}
