import type { WhatsAppProviderAdapter } from "@/lib/whatsapp/whatsapp-provider-adapter";
import type {
  NormalizedWhatsAppStatusEvent,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
} from "@/lib/whatsapp/types";

/** Twilio adapter stub — no production integration in Sprint 9B. */
export class TwilioAdapter implements WhatsAppProviderAdapter {
  readonly provider = "twilio" as const;

  async sendTemplateMessage(
    _input: SendTemplateMessageInput
  ): Promise<SendTemplateMessageResult> {
    throw new Error("Twilio WhatsApp integration is not enabled in Sprint 9B MVP");
  }

  verifyWebhook(): boolean {
    return false;
  }

  normalizeStatusEvent(): NormalizedWhatsAppStatusEvent[] {
    return [];
  }
}
