import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { convertQuotationToBooking } from "@/lib/crm/quotations-service";
import { emitAndDispatch } from "@/lib/events/dispatch-event";
import { DOMAIN_EVENT_TYPE, buildIdempotencyKey } from "@/lib/events/types";
import type { NormalizedWebhookEvent } from "@/lib/payments/types";
import { getTenantPaymentSettings } from "@/lib/payments/tenant-payment-settings-service";

export class PaymentCompletionError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "PaymentCompletionError";
  }
}

export async function storeProviderWebhookEvent(
  admin: SupabaseClient,
  event: NormalizedWebhookEvent,
  signatureValid: boolean
): Promise<{ id: string; alreadyProcessed: boolean }> {
  const idempotencyKey = `webhook:${event.provider}:${event.providerEventId}`;

  const { data: existing } = await admin
    .from("payment_provider_events")
    .select("id, processed_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing?.processed_at) {
    return { id: existing.id as string, alreadyProcessed: true };
  }

  const { data: inserted, error } = await admin
    .from("payment_provider_events")
    .upsert(
      {
        provider: event.provider,
        provider_event_id: event.providerEventId,
        event_type: event.eventType,
        payload: event.raw,
        signature_valid: signatureValid,
        idempotency_key: idempotencyKey,
        processing_result: existing ? null : "pending",
      },
      { onConflict: "idempotency_key" }
    )
    .select("id, processed_at")
    .single();

  if (error) throw new PaymentCompletionError(error.message, "STORE_FAILED");

  if (inserted?.processed_at) {
    return { id: inserted.id as string, alreadyProcessed: true };
  }

  return { id: inserted?.id as string, alreadyProcessed: false };
}

export async function completePaymentFromWebhook(
  event: NormalizedWebhookEvent,
  options?: { signatureValid?: boolean }
): Promise<{ status: "processed" | "ignored" | "duplicate" }> {
  const admin = createAdminClient();
  const signatureValid = options?.signatureValid ?? false;

  const stored = await storeProviderWebhookEvent(admin, event, signatureValid);
  if (stored.alreadyProcessed) {
    return { status: "duplicate" };
  }

  if (!signatureValid) {
    await admin
      .from("payment_provider_events")
      .update({
        processing_result: "invalid_signature",
        processed_at: new Date().toISOString(),
      })
      .eq("id", stored.id);
    throw new PaymentCompletionError("Invalid webhook signature", "INVALID_SIGNATURE");
  }

  if (!event.success) {
    await failPaymentOrder(admin, event, stored.id);
    return { status: "ignored" };
  }

  const { data: order, error: orderError } = await admin
    .from("payment_orders")
    .select("*")
    .eq("id", event.merchantOrderId)
    .maybeSingle();

  if (orderError || !order) {
    await markProviderEvent(admin, stored.id, "order_not_found");
    throw new PaymentCompletionError("Payment order not found", "ORDER_NOT_FOUND");
  }

  if (order.status === "completed") {
    await markProviderEvent(admin, stored.id, "already_completed");
    return { status: "duplicate" };
  }

  const expectedCents = Math.round(Number(order.amount) * 100);
  if (event.amountCents > 0 && Math.abs(event.amountCents - expectedCents) > 1) {
    await markProviderEvent(admin, stored.id, "amount_mismatch");
    throw new PaymentCompletionError("Payment amount mismatch", "AMOUNT_MISMATCH");
  }

  const { data: attempt } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("payment_order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt) {
    await markProviderEvent(admin, stored.id, "attempt_not_found");
    throw new PaymentCompletionError("Payment attempt not found", "ATTEMPT_NOT_FOUND");
  }

  const now = new Date().toISOString();
  await admin
    .from("payment_attempts")
    .update({
      status: "captured",
      captured_at: now,
      provider_reference: event.providerReference,
      updated_at: now,
    })
    .eq("id", attempt.id);

  let bookingId = order.booking_id as string | null;
  let referenceNumber: string | null = null;
  const settings = await getTenantPaymentSettings(order.tenant_id as string);

  if (order.quotation_id && !bookingId) {
    const { data: quote } = await admin
      .from("quotations")
      .select("status, booking_id")
      .eq("id", order.quotation_id)
      .single();

    if (quote?.status === "accepted" && !quote.booking_id) {
      const converted = await convertQuotationToBooking(
        admin,
        order.tenant_id as string,
        null,
        order.quotation_id as string
      );
      bookingId = converted.booking_id;
      referenceNumber = converted.reference_number;

      if (settings.confirm_on_deposit) {
        await admin
          .from("bookings")
          .update({ status: "confirmed", updated_at: now })
          .eq("id", bookingId);
      }
    } else if (quote?.booking_id) {
      bookingId = quote.booking_id as string;
    }
  }

  if (!bookingId) {
    await markProviderEvent(admin, stored.id, "no_booking");
    throw new PaymentCompletionError("Could not resolve booking for payment", "NO_BOOKING");
  }

  const { data: existingLedger } = await admin
    .from("payments")
    .select("id")
    .eq("payment_attempt_id", attempt.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existingLedger) {
    const { error: payError } = await admin.from("payments").insert({
      tenant_id: order.tenant_id,
      booking_id: bookingId,
      amount: order.amount,
      method: "card",
      reference_number: `paymob:${event.providerReference}`,
      payment_date: new Date().toISOString().slice(0, 10),
      notes: `Gateway payment for order ${order.id}`,
      source: "gateway",
      provider: "paymob",
      payment_order_id: order.id,
      payment_attempt_id: attempt.id,
    });

    if (payError) {
      await markProviderEvent(admin, stored.id, "ledger_failed");
      throw new PaymentCompletionError(payError.message, "LEDGER_FAILED");
    }
  }

  await admin
    .from("payment_orders")
    .update({
      status: "completed",
      booking_id: bookingId,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", order.id);

  await markProviderEvent(admin, stored.id, "processed");

  const customerId = order.customer_id as string;
  const tenantId = order.tenant_id as string;

  const paymentCompletedKey = buildIdempotencyKey(
    DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
    tenantId,
    "payment_order",
    order.id as string,
    attempt.id as string
  );

  const { data: portalAccount } = await admin
    .from("customer_portal_accounts")
    .select("email")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();

  const paymentEvent = await emitAndDispatch({
    tenantId,
    eventType: DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
    aggregateType: "payment_order",
    aggregateId: order.id as string,
    customerId,
    actorType: "system",
    payload: {
      payment_order_id: order.id,
      payment_attempt_id: attempt.id,
      quotation_id: order.quotation_id,
      booking_id: bookingId,
      amount: order.amount,
      currency: order.currency,
      provider: "paymob",
      provider_reference: event.providerReference,
      reference_number: referenceNumber,
      recipient_email: portalAccount?.email ?? null,
    },
    idempotencyKey: paymentCompletedKey,
  });

  if (order.quotation_id && referenceNumber) {
    await emitAndDispatch({
      tenantId,
      eventType: DOMAIN_EVENT_TYPE.BOOKING_CREATED,
      aggregateType: "booking",
      aggregateId: bookingId,
      customerId,
      actorType: "system",
      payload: {
        reference_number: referenceNumber,
        quotation_id: order.quotation_id,
        from_payment_order_id: order.id,
        payment_domain_event_id: paymentEvent.id,
      },
      idempotencyKey: buildIdempotencyKey(
        DOMAIN_EVENT_TYPE.BOOKING_CREATED,
        tenantId,
        "booking",
        bookingId,
        `pay:${order.id}`
      ),
    });
  }

  return { status: "processed" };
}

async function failPaymentOrder(
  admin: SupabaseClient,
  event: NormalizedWebhookEvent,
  providerEventId: string
): Promise<void> {
  const { data: order } = await admin
    .from("payment_orders")
    .select("id, tenant_id, customer_id")
    .eq("id", event.merchantOrderId)
    .maybeSingle();

  if (order) {
    await admin
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    try {
      await emitAndDispatch({
        tenantId: order.tenant_id as string,
        eventType: DOMAIN_EVENT_TYPE.PAYMENT_FAILED,
        aggregateType: "payment_order",
        aggregateId: order.id as string,
        customerId: order.customer_id as string,
        actorType: "system",
        payload: {
          provider_reference: event.providerReference,
          merchant_order_id: event.merchantOrderId,
        },
        idempotencyKey: buildIdempotencyKey(
          DOMAIN_EVENT_TYPE.PAYMENT_FAILED,
          order.tenant_id as string,
          "payment_order",
          order.id as string,
          event.providerEventId
        ),
      });
    } catch (e) {
      console.error("payment.failed dispatch failed:", e);
    }
  }

  await markProviderEvent(admin, providerEventId, "payment_failed");
}

async function markProviderEvent(
  admin: SupabaseClient,
  id: string,
  result: string
): Promise<void> {
  await admin
    .from("payment_provider_events")
    .update({
      processing_result: result,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
}
