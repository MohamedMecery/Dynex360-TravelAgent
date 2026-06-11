export type PaymentProvider = "paymob" | "stripe";

export type PaymentOrderType =
  | "quotation_deposit"
  | "quotation_full"
  | "booking_balance"
  | "invoice_pay";

export type PaymentOrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type PaymentAttemptStatus =
  | "created"
  | "redirected"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled";

export type BookingAutomationMode =
  | "auto_on_full"
  | "auto_on_deposit"
  | "manual_after_payment";

export interface TenantPaymentSettings {
  tenant_id: string;
  payments_enabled: boolean;
  default_provider: PaymentProvider;
  deposit_percent: number;
  booking_automation_mode: BookingAutomationMode;
  confirm_on_deposit: boolean;
  paymob_integration_id: string | null;
  paymob_iframe_id: string | null;
  currency_default: string;
}

export interface PaymentOrderRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  quotation_id: string | null;
  booking_id: string | null; // set when checkout completes
  invoice_id: string | null;
  order_type: PaymentOrderType;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: PaymentProvider;
  idempotency_key: string;
  policy_snapshot: Record<string, unknown>;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAttemptRecord {
  id: string;
  tenant_id: string;
  payment_order_id: string;
  provider: PaymentProvider;
  provider_reference: string;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  failure_code: string | null;
  failure_message: string | null;
  metadata: Record<string, unknown>;
  captured_at: string | null;
  created_at: string;
}

export interface CheckoutSessionInput {
  paymentOrderId: string;
  tenantId: string;
  customerId: string;
  amount: number;
  currency: string;
  quotationNumber?: string;
  customerEmail: string;
  merchantOrderId: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerReference: string;
  raw?: Record<string, unknown>;
}

export interface NormalizedWebhookEvent {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  merchantOrderId: string;
  providerReference: string;
  success: boolean;
  amountCents: number;
  currency: string;
  raw: Record<string, unknown>;
}
