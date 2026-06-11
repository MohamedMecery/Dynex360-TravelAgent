import type { PortalApiContext } from "@/lib/auth/require-portal-api-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalQuotationById } from "@/lib/portal/portal-quotations-service";
import { getPaymentProviderAdapter } from "@/lib/payments/provider-registry";
import {
  calculateCheckoutAmount,
  getTenantPaymentSettings,
} from "@/lib/payments/tenant-payment-settings-service";
import type { PaymentAttemptRecord, PaymentOrderRecord } from "@/lib/payments/types";

export class PortalCheckoutError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const ORDER_TTL_HOURS = 24;

export async function createPortalQuotationCheckout(
  ctx: PortalApiContext,
  quotationId: string,
  idempotencyKey?: string
): Promise<{
  order: PaymentOrderRecord;
  attempt: PaymentAttemptRecord;
  checkout_url: string;
}> {
  let quotation;
  try {
    quotation = await getPortalQuotationById(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      quotationId
    );
  } catch {
    throw new PortalCheckoutError("NOT_FOUND", "Quotation not found", 404);
  }

  if (quotation.status !== "accepted") {
    throw new PortalCheckoutError(
      "QUOTATION_NOT_ACCEPTED",
      "Only accepted quotations can be paid",
      422
    );
  }

  if (quotation.booking_id) {
    throw new PortalCheckoutError(
      "ALREADY_CONVERTED",
      "Quotation is already converted to a booking",
      409
    );
  }

  const settings = await getTenantPaymentSettings(ctx.tenantId);
  if (!settings.payments_enabled) {
    throw new PortalCheckoutError(
      "PAYMENTS_DISABLED",
      "Online payments are not enabled for this agency",
      422
    );
  }

  const totalAmount = Number(quotation.total_amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new PortalCheckoutError("INVALID_AMOUNT", "Quotation total is invalid", 422);
  }

  const { amount, orderType } = calculateCheckoutAmount(totalAmount, settings);
  const currency = quotation.currency ?? settings.currency_default;
  const admin = createAdminClient();

  const stableKey =
    idempotencyKey?.trim() ||
    `portal-checkout:${ctx.tenantId}:${quotationId}:${orderType}:${amount}`;

  const { data: existingOrder } = await admin
    .from("payment_orders")
    .select("*")
    .eq("idempotency_key", stableKey)
    .maybeSingle();

  if (existingOrder) {
    if (existingOrder.status === "completed") {
      throw new PortalCheckoutError(
        "ALREADY_PAID",
        "This quotation checkout is already completed",
        409
      );
    }
    if (["pending", "processing"].includes(existingOrder.status as string)) {
      const { data: attempt } = await admin
        .from("payment_attempts")
        .select("*")
        .eq("payment_order_id", existingOrder.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const adapter = getPaymentProviderAdapter(settings.default_provider);
      const checkoutUrl =
        process.env.PAYMOB_MOCK_MODE === "true" ||
        !process.env.PAYMOB_API_KEY?.trim()
          ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/portal/payment-orders/${existingOrder.id}`
          : attempt?.metadata &&
              typeof attempt.metadata === "object" &&
              "checkout_url" in (attempt.metadata as object)
            ? String((attempt.metadata as { checkout_url: string }).checkout_url)
            : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/portal/payment-orders/${existingOrder.id}`;

      return {
        order: existingOrder as PaymentOrderRecord,
        attempt: attempt as PaymentAttemptRecord,
        checkout_url: checkoutUrl,
      };
    }
  }

  const expiresAt = new Date(Date.now() + ORDER_TTL_HOURS * 3600 * 1000).toISOString();

  const { data: order, error: orderError } = await admin
    .from("payment_orders")
    .insert({
      tenant_id: ctx.tenantId,
      customer_id: ctx.customerId,
      quotation_id: quotationId,
      order_type: orderType,
      amount,
      currency,
      status: "pending",
      provider: settings.default_provider,
      idempotency_key: stableKey,
      policy_snapshot: {
        deposit_percent: settings.deposit_percent,
        booking_automation_mode: settings.booking_automation_mode,
        confirm_on_deposit: settings.confirm_on_deposit,
        quotation_total: totalAmount,
      },
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    throw new PortalCheckoutError(
      "ORDER_CREATE_FAILED",
      orderError?.message ?? "Failed to create payment order",
      500
    );
  }

  const adapter = getPaymentProviderAdapter(settings.default_provider);
  const session = await adapter.createCheckoutSession({
    paymentOrderId: order.id as string,
    tenantId: ctx.tenantId,
    customerId: ctx.customerId,
    amount,
    currency,
    quotationNumber: quotation.quotation_number,
    customerEmail: ctx.email,
    merchantOrderId: order.id as string,
  });

  const { data: attempt, error: attemptError } = await admin
    .from("payment_attempts")
    .insert({
      tenant_id: ctx.tenantId,
      payment_order_id: order.id,
      provider: settings.default_provider,
      provider_reference: session.providerReference,
      status: "redirected",
      amount,
      currency,
      metadata: { checkout_url: session.checkoutUrl, ...session.raw },
    })
    .select("*")
    .single();

  if (attemptError || !attempt) {
    throw new PortalCheckoutError(
      "ATTEMPT_CREATE_FAILED",
      attemptError?.message ?? "Failed to create payment attempt",
      500
    );
  }

  await admin
    .from("payment_orders")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  try {
    const { emitAndDispatch } = await import("@/lib/events/dispatch-event");
    const { DOMAIN_EVENT_TYPE, buildIdempotencyKey } = await import("@/lib/events/types");
    await emitAndDispatch({
      tenantId: ctx.tenantId,
      eventType: DOMAIN_EVENT_TYPE.PAYMENT_CREATED,
      aggregateType: "payment_order",
      aggregateId: order.id as string,
      customerId: ctx.customerId,
      actorType: "customer",
      actorCustomerId: ctx.customerId,
      actorPortalAccountId: ctx.accountId,
      payload: {
        quotation_id: quotationId,
        quotation_number: quotation.quotation_number,
        amount,
        currency,
        order_type: orderType,
      },
      idempotencyKey: buildIdempotencyKey(
        DOMAIN_EVENT_TYPE.PAYMENT_CREATED,
        ctx.tenantId,
        "payment_order",
        order.id as string
      ),
    });
  } catch (e) {
    console.error("payment.created dispatch failed:", e);
  }

  return {
    order: { ...order, status: "processing" } as PaymentOrderRecord,
    attempt: attempt as PaymentAttemptRecord,
    checkout_url: session.checkoutUrl,
  };
}

export async function getPortalPaymentOrder(
  ctx: PortalApiContext,
  orderId: string
): Promise<{
  order: PaymentOrderRecord;
  attempts: PaymentAttemptRecord[];
  ledger_payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    reference_number: string | null;
  }>;
}> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .eq("customer_id", ctx.customerId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) {
    throw new PortalCheckoutError("NOT_FOUND", "Payment order not found", 404);
  }

  const { data: attempts } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("payment_order_id", orderId)
    .order("created_at", { ascending: false });

  let ledger_payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    reference_number: string | null;
  }> = [];

  if (order.booking_id) {
    const { data: payments } = await admin
      .from("payments")
      .select("id, amount, payment_date, reference_number")
      .eq("booking_id", order.booking_id)
      .eq("payment_order_id", orderId)
      .is("deleted_at", null);
    ledger_payments = (payments ?? []).map((p) => ({
      id: p.id as string,
      amount: Number(p.amount),
      payment_date: p.payment_date as string,
      reference_number: (p.reference_number as string) ?? null,
    }));
  }

  return {
    order: order as PaymentOrderRecord,
    attempts: (attempts ?? []) as PaymentAttemptRecord[],
    ledger_payments,
  };
}
