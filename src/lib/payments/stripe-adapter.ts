import type { PaymentProviderAdapter } from "@/lib/payments/payment-provider-adapter";
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
} from "@/lib/payments/types";

/** Stripe adapter stub — no production integration in Sprint 9A. */
export class StripeAdapter implements PaymentProviderAdapter {
  readonly provider = "stripe" as const;

  async createCheckoutSession(
    _input: CheckoutSessionInput
  ): Promise<CheckoutSessionResult> {
    throw new Error("Stripe integration is not enabled in Sprint 9A MVP");
  }

  verifyWebhook(): boolean {
    return false;
  }

  normalizeWebhookEvent(): NormalizedWebhookEvent | null {
    return null;
  }
}
