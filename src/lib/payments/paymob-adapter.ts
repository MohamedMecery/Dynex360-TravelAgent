import { createHmac } from "node:crypto";
import type { PaymentProviderAdapter } from "@/lib/payments/payment-provider-adapter";
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
} from "@/lib/payments/types";

function getPaymobConfig() {
  return {
    apiKey: process.env.PAYMOB_API_KEY ?? "",
    integrationId: process.env.PAYMOB_INTEGRATION_ID ?? "",
    iframeId: process.env.PAYMOB_IFRAME_ID ?? "",
    hmacSecret: process.env.PAYMOB_HMAC_SECRET ?? "",
    mockMode:
      process.env.PAYMOB_MOCK_MODE === "true" ||
      !process.env.PAYMOB_API_KEY?.trim(),
    baseUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    ),
  };
}

async function paymobAuthToken(apiKey: string): Promise<string> {
  const res = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    throw new Error(`Paymob auth failed: ${res.status}`);
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("Paymob auth returned no token");
  return json.token;
}

export class PaymobAdapter implements PaymentProviderAdapter {
  readonly provider = "paymob" as const;

  async createCheckoutSession(
    input: CheckoutSessionInput
  ): Promise<CheckoutSessionResult> {
    const config = getPaymobConfig();
    const providerReference = `paymob-${input.paymentOrderId}`;

    if (config.mockMode) {
      return {
        checkoutUrl: `${config.baseUrl}/portal/payment-orders/${input.paymentOrderId}`,
        providerReference,
        raw: { mock: true },
      };
    }

    if (!config.apiKey || !config.integrationId || !config.iframeId) {
      throw new Error("Paymob is not configured (API key, integration, iframe)");
    }

    const token = await paymobAuthToken(config.apiKey);
    const amountCents = Math.round(input.amount * 100);

    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: input.currency,
        merchant_order_id: input.merchantOrderId,
        items: [],
      }),
    });
    if (!orderRes.ok) {
      throw new Error(`Paymob order failed: ${orderRes.status}`);
    }
    const orderJson = (await orderRes.json()) as { id?: number };
    if (!orderJson.id) throw new Error("Paymob order returned no id");

    const keyRes = await fetch(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: token,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: orderJson.id,
          billing_data: {
            email: input.customerEmail,
            first_name: "Customer",
            last_name: "Portal",
            phone_number: "0000000000",
            apartment: "NA",
            floor: "NA",
            street: "NA",
            building: "NA",
            shipping_method: "NA",
            postal_code: "NA",
            city: "NA",
            country: "EG",
            state: "NA",
          },
          currency: input.currency,
          integration_id: Number(config.integrationId),
        }),
      }
    );
    if (!keyRes.ok) {
      throw new Error(`Paymob payment key failed: ${keyRes.status}`);
    }
    const keyJson = (await keyRes.json()) as { token?: string };
    if (!keyJson.token) throw new Error("Paymob payment key returned no token");

    const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${config.iframeId}?payment_token=${keyJson.token}`;

    return {
      checkoutUrl,
      providerReference: String(orderJson.id),
      raw: { order_id: orderJson.id, payment_token: keyJson.token },
    };
  }

  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    const config = getPaymobConfig();
    if (config.mockMode && process.env.PAYMOB_MOCK_WEBHOOKS === "true") {
      return true;
    }
    const hmac =
      (headers["hmac"] as string | undefined) ??
      (headers["HMAC"] as string | undefined);
    if (!hmac || !config.hmacSecret) return false;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return false;
    }

    const obj = payload.obj as Record<string, unknown> | undefined;
    if (!obj) return false;

    const concat = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      obj.order,
      obj.owner,
      obj.pending,
      obj.source_data,
      obj.success,
    ]
      .map((v) => {
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      })
      .join("");

    const calculated = createHmac("sha512", config.hmacSecret)
      .update(concat)
      .digest("hex");

    return calculated === hmac;
  }

  normalizeWebhookEvent(
    payload: Record<string, unknown>
  ): NormalizedWebhookEvent | null {
    const obj = payload.obj as Record<string, unknown> | undefined;
    if (!obj) return null;

    const order = obj.order as Record<string, unknown> | undefined;
    const merchantOrderId = String(order?.merchant_order_id ?? "");
    if (!merchantOrderId) return null;

    const providerEventId = String(obj.id ?? payload.id ?? merchantOrderId);
    const amountCents = Number(obj.amount_cents ?? 0);
    const success = Boolean(obj.success);

    return {
      provider: "paymob",
      providerEventId,
      eventType: String(payload.type ?? "TRANSACTION"),
      merchantOrderId,
      providerReference: String(order?.id ?? obj.order ?? providerEventId),
      success,
      amountCents,
      currency: String(obj.currency ?? "EGP"),
      raw: payload,
    };
  }
}
