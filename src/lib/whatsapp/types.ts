/** Sprint 9B — WhatsApp provider types (Meta Cloud API MVP). */

export type WhatsAppProvider = "meta_cloud" | "twilio";

export type WhatsAppTemplateLanguage = "en" | "ar";

export type WhatsAppMetaApprovalStatus = "pending" | "approved" | "rejected";

export type WhatsAppMessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface SendTemplateMessageInput {
  toPhoneE164: string;
  templateName: string;
  languageCode: WhatsAppTemplateLanguage;
  bodyVariables: string[];
}

export interface SendTemplateMessageResult {
  providerMessageId: string | null;
  status: "sent" | "failed";
  errorMessage?: string;
  raw?: Record<string, unknown>;
}

export type WhatsAppStatusEventType = "sent" | "delivered" | "read" | "failed";

export interface NormalizedWhatsAppStatusEvent {
  providerMessageId: string;
  status: WhatsAppStatusEventType;
  errorMessage?: string;
  occurredAt?: string;
}

export interface TenantWhatsAppSettings {
  tenant_id: string;
  whatsapp_enabled: boolean;
  default_provider: WhatsAppProvider;
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;
  meta_access_token_secret: string | null;
  webhook_verify_token: string | null;
}

export interface WhatsAppTemplateRecord {
  id: string;
  tenant_id: string;
  internal_name: string;
  meta_template_name: string;
  language: WhatsAppTemplateLanguage;
  category: string;
  meta_status: WhatsAppMetaApprovalStatus;
  body_preview: string | null;
  variable_count: number;
  event_type: string | null;
  is_active: boolean;
}
