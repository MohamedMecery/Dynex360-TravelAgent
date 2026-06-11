import { emailT, type EmailLocale } from "@/lib/email/messages";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import type { EmailBrandingContext } from "@/lib/email/types";

export interface QuotationPortalEmailParams {
  locale: EmailLocale;
  branding: EmailBrandingContext;
  quotationNumber: string;
  customerName: string;
  totalAmount: string;
  validUntil: string;
  portalUrl: string;
}

export function renderQuotationAcceptedEmail(
  params: QuotationPortalEmailParams
): { subject: string; html: string; text: string } {
  const { locale, branding, quotationNumber, customerName, totalAmount, validUntil, portalUrl } =
    params;

  const title = emailT(locale, "quotationAccepted.title");
  const bodyHtml = `
    <p style="margin:0 0 16px;">${emailT(locale, "quotationAccepted.intro")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationAccepted.number")}</td><td style="padding:6px 0;font-weight:600;">${quotationNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationAccepted.customer")}</td><td style="padding:6px 0;">${customerName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationAccepted.total")}</td><td style="padding:6px 0;">${totalAmount}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationAccepted.validUntil")}</td><td style="padding:6px 0;">${validUntil}</td></tr>
    </table>
  `;

  const { html, text } = renderEmailLayout({
    locale,
    branding,
    title,
    bodyHtml,
    ctaLabel: emailT(locale, "quotationAccepted.cta"),
    ctaUrl: portalUrl,
  });

  return {
    subject: emailT(locale, "quotationAccepted.subject", { number: quotationNumber }),
    html,
    text,
  };
}

export function renderQuotationRejectedEmail(
  params: QuotationPortalEmailParams & { reason?: string | null }
): { subject: string; html: string; text: string } {
  const {
    locale,
    branding,
    quotationNumber,
    customerName,
    totalAmount,
    portalUrl,
    reason,
  } = params;

  const title = emailT(locale, "quotationRejected.title");
  const reasonRow = reason?.trim()
    ? `<tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationRejected.reason")}</td><td style="padding:6px 0;">${reason}</td></tr>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 16px;">${emailT(locale, "quotationRejected.intro")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationRejected.number")}</td><td style="padding:6px 0;font-weight:600;">${quotationNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationRejected.customer")}</td><td style="padding:6px 0;">${customerName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "quotationRejected.total")}</td><td style="padding:6px 0;">${totalAmount}</td></tr>
      ${reasonRow}
    </table>
  `;

  const { html, text } = renderEmailLayout({
    locale,
    branding,
    title,
    bodyHtml,
    ctaLabel: emailT(locale, "quotationRejected.cta"),
    ctaUrl: portalUrl,
  });

  return {
    subject: emailT(locale, "quotationRejected.subject", { number: quotationNumber }),
    html,
    text,
  };
}
