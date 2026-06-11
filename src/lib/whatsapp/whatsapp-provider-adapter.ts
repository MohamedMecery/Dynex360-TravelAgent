import type {
  NormalizedWhatsAppStatusEvent,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
  WhatsAppProvider,
} from "@/lib/whatsapp/types";

/** Sprint 9B — provider contract (template-only outbound). */
export interface WhatsAppProviderAdapter {
  readonly provider: WhatsAppProvider;

  sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult>;

  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean;

  normalizeStatusEvent(
    payload: Record<string, unknown>
  ): NormalizedWhatsAppStatusEvent[];
}
