import { PaymobAdapter } from "@/lib/payments/paymob-adapter";
import type { PaymentProviderAdapter } from "@/lib/payments/payment-provider-adapter";
import { StripeAdapter } from "@/lib/payments/stripe-adapter";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProviderAdapter(
  provider: PaymentProvider
): PaymentProviderAdapter {
  switch (provider) {
    case "paymob":
      return new PaymobAdapter();
    case "stripe":
      return new StripeAdapter();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
