import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
  PaymentProvider,
} from "@/lib/payments/types";

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;

  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;

  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean;

  normalizeWebhookEvent(
    payload: Record<string, unknown>
  ): NormalizedWebhookEvent | null;
}
