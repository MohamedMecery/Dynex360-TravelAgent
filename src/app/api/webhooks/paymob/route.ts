import { NextResponse } from "next/server";
import { PaymobAdapter } from "@/lib/payments/paymob-adapter";
import {
  completePaymentFromWebhook,
  PaymentCompletionError,
} from "@/lib/payments/payment-completion-service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const adapter = new PaymobAdapter();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Signature bypass is decided inside verifyWebhook and requires the explicit
  // PAYMOB_MOCK_WEBHOOKS=true flag — mock checkout mode alone must never
  // accept unsigned webhooks.
  const signatureValid = adapter.verifyWebhook(rawBody, headers);

  const normalized = adapter.normalizeWebhookEvent(payload);
  if (!normalized) {
    return NextResponse.json(
      { error: { code: "UNRECOGNIZED", message: "Unrecognized webhook payload" } },
      { status: 422 }
    );
  }

  try {
    const result = await completePaymentFromWebhook(normalized, { signatureValid });
    return NextResponse.json({ data: { status: result.status } });
  } catch (err) {
    if (err instanceof PaymentCompletionError) {
      const status =
        err.code === "INVALID_SIGNATURE"
          ? 401
          : err.code === "AMOUNT_MISMATCH"
            ? 422
            : 400;
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status }
      );
    }
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
