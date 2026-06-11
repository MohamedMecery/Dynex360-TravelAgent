import type { EmailLocale } from "@/lib/email/messages";

export type TransactionalEmailType =
  | "welcome"
  | "booking_confirmation"
  | "support_ticket"
  | "quotation_accepted"
  | "quotation_rejected";

export type EmailDeliveryStatus = "sent" | "failed" | "skipped";

/**
 * Phase 2 — per-tenant email preferences (not persisted; pass when loading tenant context).
 */
export interface TenantEmailPreferencesExtension {
  welcome_enabled?: boolean;
  booking_confirmation_enabled?: boolean;
  support_ticket_enabled?: boolean;
}

export interface EmailBrandingContext {
  companyName: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  siteUrl: string;
}

export interface SendTransactionalEmailInput {
  type: TransactionalEmailType;
  tenantId: string;
  to: string;
  locale: EmailLocale;
  branding: EmailBrandingContext;
  subject: string;
  html: string;
  text: string;
  preferences?: TenantEmailPreferencesExtension;
  domainEventId?: string;
}

export interface SendTransactionalEmailResult {
  status: EmailDeliveryStatus;
  errorMessage?: string;
  providerId?: string;
}

export interface EmailProviderSendInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProviderSendResult {
  id?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(input: EmailProviderSendInput): Promise<EmailProviderSendResult>;
}
