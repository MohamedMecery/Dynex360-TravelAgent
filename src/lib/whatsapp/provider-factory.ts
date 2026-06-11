import { MetaCloudAdapter } from "@/lib/whatsapp/meta-cloud-adapter";
import { MockWhatsAppAdapter } from "@/lib/whatsapp/mock-whatsapp-adapter";
import { TwilioAdapter } from "@/lib/whatsapp/twilio-adapter";
import type { WhatsAppProviderAdapter } from "@/lib/whatsapp/whatsapp-provider-adapter";
import type { WhatsAppProvider, TenantWhatsAppSettings } from "@/lib/whatsapp/types";

export function isWhatsAppMockMode(): boolean {
  return (
    process.env.WHATSAPP_MOCK_MODE === "true" ||
    !process.env.WHATSAPP_META_ACCESS_TOKEN?.trim()
  );
}

export function createWhatsAppAdapter(
  provider: WhatsAppProvider,
  settings?: Pick<
    TenantWhatsAppSettings,
    "meta_phone_number_id" | "meta_access_token_secret"
  > | null
): WhatsAppProviderAdapter {
  if (isWhatsAppMockMode()) {
    return new MockWhatsAppAdapter();
  }

  if (provider === "twilio") {
    return new TwilioAdapter();
  }

  return new MetaCloudAdapter({
    phoneNumberId: settings?.meta_phone_number_id ?? undefined,
    accessToken: settings?.meta_access_token_secret ?? undefined,
  });
}
