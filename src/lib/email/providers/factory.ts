import { getEmailProviderName } from "@/lib/email/config";
import { ResendEmailProvider } from "@/lib/email/providers/resend-provider";
import { SmtpEmailProvider } from "@/lib/email/providers/smtp-provider";
import type { EmailProvider } from "@/lib/email/types";

export function createEmailProvider(): EmailProvider | null {
  const name = getEmailProviderName();

  if (name === "smtp") {
    if (
      !process.env.SMTP_HOST?.trim() ||
      !process.env.SMTP_USER?.trim() ||
      !process.env.SMTP_PASSWORD?.trim()
    ) {
      return null;
    }
    return new SmtpEmailProvider();
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new ResendEmailProvider(apiKey);
}
