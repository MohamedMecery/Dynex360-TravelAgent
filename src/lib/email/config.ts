export type EmailProviderName = "resend" | "smtp";

export function getEmailProviderName(): EmailProviderName {
  const value = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (value === "smtp") return "smtp";
  return "resend";
}

export function getDefaultFromEmail(): string {
  return (
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "noreply@travelos.app"
  );
}

export function getDefaultFromName(): string {
  return process.env.SMTP_FROM_NAME?.trim() || "TravelOS";
}

export function formatFromAddress(companyName?: string): string {
  const name = companyName?.trim() || getDefaultFromName();
  const email = getDefaultFromEmail();
  return `${name} <${email}>`;
}

export function isEmailSendingEnabled(): boolean {
  const provider = getEmailProviderName();
  if (provider === "resend") {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim()
  );
}
