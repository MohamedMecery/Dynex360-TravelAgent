import type { WhatsAppProviderAdapter } from "@/lib/whatsapp/whatsapp-provider-adapter";
import type {
  NormalizedWhatsAppStatusEvent,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
} from "@/lib/whatsapp/types";

/** Deterministic mock adapter for tests and local dev gates. */
export class MockWhatsAppAdapter implements WhatsAppProviderAdapter {
  readonly provider = "meta_cloud" as const;

  async sendTemplateMessage(
    input: SendTemplateMessageInput
  ): Promise<SendTemplateMessageResult> {
    return {
      providerMessageId: `mock-${input.templateName}-${input.toPhoneE164}`,
      status: "sent",
      raw: { mock: true },
    };
  }

  verifyWebhook(): boolean {
    return true;
  }

  normalizeStatusEvent(
    payload: Record<string, unknown>
  ): NormalizedWhatsAppStatusEvent[] {
    const events = payload.events as NormalizedWhatsAppStatusEvent[] | undefined;
    return Array.isArray(events) ? events : [];
  }
}
