import { emailT, type EmailLocale } from "@/lib/email/messages";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import type { EmailBrandingContext } from "@/lib/email/types";

export interface WelcomeEmailParams {
  locale: EmailLocale;
  branding: EmailBrandingContext;
  userName: string;
}

export function renderWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { locale, branding, userName } = params;
  const title = emailT(locale, "welcome.title", { company: branding.companyName });
  const bodyHtml = `
    <p style="margin:0 0 12px;">${emailT(locale, "welcome.greeting", { name: userName })}</p>
    <p style="margin:0 0 12px;">${emailT(locale, "welcome.intro")}</p>
    <ul style="margin:0;padding-${locale === "ar" ? "right" : "left"}:20px;">
      <li>${emailT(locale, "welcome.tip1")}</li>
      <li>${emailT(locale, "welcome.tip2")}</li>
      <li>${emailT(locale, "welcome.tip3")}</li>
    </ul>
  `;

  const { html, text } = renderEmailLayout({
    locale,
    branding,
    title,
    bodyHtml,
    ctaLabel: emailT(locale, "welcome.cta"),
    ctaUrl: `${branding.siteUrl}/dashboard`,
  });

  return {
    subject: emailT(locale, "welcome.subject", { company: branding.companyName }),
    html,
    text,
  };
}
