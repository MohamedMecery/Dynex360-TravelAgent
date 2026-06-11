import { createHmac, timingSafeEqual } from "node:crypto";
import type { WhatsAppProviderAdapter } from "@/lib/whatsapp/whatsapp-provider-adapter";
import type {
  NormalizedWhatsAppStatusEvent,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
} from "@/lib/whatsapp/types";

function getMetaConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_META_ACCESS_TOKEN ?? "",
    appSecret: process.env.WHATSAPP_META_APP_SECRET ?? "",
    apiVersion: process.env.WHATSAPP_META_API_VERSION ?? "v21.0",
    mockMode:
      process.env.WHATSAPP_MOCK_MODE === "true" ||
      !process.env.WHATSAPP_META_ACCESS_TOKEN?.trim(),
  };
}

function mapMetaLanguage(code: string): string {
  return code === "ar" ? "ar" : "en_US";
}

export class MetaCloudAdapter implements WhatsAppProviderAdapter {
  readonly provider = "meta_cloud" as const;

  constructor(
    private readonly overrides?: {
      phoneNumberId?: string;
      accessToken?: string;
    }
  ) {}

  async sendTemplateMessage(
    input: SendTemplateMessageInput
  ): Promise<SendTemplateMessageResult> {
    const config = getMetaConfig();
    const phoneNumberId = this.overrides?.phoneNumberId ?? config.phoneNumberId;
    const accessToken = this.overrides?.accessToken ?? config.accessToken;

    if (config.mockMode) {
      const mockId = `mock-wa-${Date.now()}`;
      return {
        providerMessageId: mockId,
        status: "sent",
        raw: { mock: true, to: input.toPhoneE164, template: input.templateName },
      };
    }

    if (!phoneNumberId?.trim() || !accessToken?.trim()) {
      return {
        providerMessageId: null,
        status: "failed",
        errorMessage: "Meta Cloud API is not configured",
      };
    }

    const components =
      input.bodyVariables.length > 0
        ? [
            {
              type: "body",
              parameters: input.bodyVariables.map((text) => ({
                type: "text",
                text,
              })),
            },
          ]
        : undefined;

    const body = {
      messaging_product: "whatsapp",
      to: input.toPhoneE164.replace(/\D/g, ""),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: mapMetaLanguage(input.languageCode) },
        ...(components ? { components } : {}),
      },
    };

    const url = `https://graph.facebook.com/${config.apiVersion}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        providerMessageId: null,
        status: "failed",
        errorMessage: json.error?.message ?? `Meta API error ${res.status}`,
        raw: json as Record<string, unknown>,
      };
    }

    const providerMessageId = json.messages?.[0]?.id ?? null;
    return {
      providerMessageId,
      status: providerMessageId ? "sent" : "failed",
      errorMessage: providerMessageId ? undefined : "Meta API returned no message id",
      raw: json as Record<string, unknown>,
    };
  }

  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    const config = getMetaConfig();
    if (config.mockMode) return true;

    const secret = config.appSecret?.trim();
    if (!secret) return false;

    const signatureHeader = headers["x-hub-signature-256"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!signature?.startsWith("sha256=")) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signature.slice("sha256=".length);

    try {
      return timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(provided, "hex")
      );
    } catch {
      return false;
    }
  }

  normalizeStatusEvent(
    payload: Record<string, unknown>
  ): NormalizedWhatsAppStatusEvent[] {
    const entry = payload.entry as unknown[] | undefined;
    if (!Array.isArray(entry)) return [];

    const events: NormalizedWhatsAppStatusEvent[] = [];

    for (const ent of entry) {
      const changes = (ent as { changes?: unknown[] })?.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> })?.value;
        const statuses = value?.statuses as unknown[] | undefined;
        if (!Array.isArray(statuses)) continue;

        for (const st of statuses) {
          const row = st as {
            id?: string;
            status?: string;
            timestamp?: string;
            errors?: { title?: string; message?: string }[];
          };
          if (!row.id || !row.status) continue;

          const mapped = mapWebhookStatus(row.status);
          if (!mapped) continue;

          const err = row.errors?.[0];
          events.push({
            providerMessageId: row.id,
            status: mapped,
            errorMessage: err?.message ?? err?.title,
            occurredAt: row.timestamp
              ? new Date(Number(row.timestamp) * 1000).toISOString()
              : undefined,
          });
        }
      }
    }

    return events;
  }
}

function mapWebhookStatus(
  status: string
): NormalizedWhatsAppStatusEvent["status"] | null {
  switch (status) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}
