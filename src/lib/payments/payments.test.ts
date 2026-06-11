import assert from "node:assert/strict";
import test from "node:test";
import { PaymobAdapter } from "@/lib/payments/paymob-adapter";
import { StripeAdapter } from "@/lib/payments/stripe-adapter";
import { calculateCheckoutAmount } from "@/lib/payments/tenant-payment-settings-service";
import type { TenantPaymentSettings } from "@/lib/payments/types";

const baseSettings: TenantPaymentSettings = {
  tenant_id: "t1",
  payments_enabled: true,
  default_provider: "paymob",
  deposit_percent: 30,
  booking_automation_mode: "auto_on_deposit",
  confirm_on_deposit: false,
  paymob_integration_id: null,
  paymob_iframe_id: null,
  currency_default: "EGP",
};

test("calculateCheckoutAmount uses deposit for auto_on_deposit", () => {
  const { amount, orderType } = calculateCheckoutAmount(1000, baseSettings);
  assert.equal(orderType, "quotation_deposit");
  assert.equal(amount, 300);
});

test("calculateCheckoutAmount uses full for auto_on_full", () => {
  const { amount, orderType } = calculateCheckoutAmount(1000, {
    ...baseSettings,
    booking_automation_mode: "auto_on_full",
  });
  assert.equal(orderType, "quotation_full");
  assert.equal(amount, 1000);
});

test("PaymobAdapter normalizeWebhookEvent parses transaction", () => {
  const adapter = new PaymobAdapter();
  const normalized = adapter.normalizeWebhookEvent({
    type: "TRANSACTION",
    obj: {
      id: 999,
      success: true,
      amount_cents: 30000,
      currency: "EGP",
      order: { merchant_order_id: "order-uuid", id: 12345 },
    },
  });
  assert.ok(normalized);
  assert.equal(normalized?.merchantOrderId, "order-uuid");
  assert.equal(normalized?.success, true);
  assert.equal(normalized?.amountCents, 30000);
});

test("StripeAdapter createCheckoutSession throws", async () => {
  const adapter = new StripeAdapter();
  await assert.rejects(() =>
    adapter.createCheckoutSession({
      paymentOrderId: "o1",
      tenantId: "t1",
      customerId: "c1",
      amount: 10,
      currency: "USD",
      customerEmail: "a@b.com",
      merchantOrderId: "o1",
    })
  );
});
