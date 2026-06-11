import { emailT, type EmailLocale } from "@/lib/email/messages";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import type { EmailBrandingContext } from "@/lib/email/types";

export interface SupportTicketEmailParams {
  locale: EmailLocale;
  branding: EmailBrandingContext;
  ticketNumber: string;
  status: string;
  subject: string;
  summary: string;
  ticketUrl: string;
  eventLabel: string;
}

export function renderSupportTicketEmail(
  params: SupportTicketEmailParams
): { subject: string; html: string; text: string } {
  const { locale, branding, ticketNumber, status, subject, summary, ticketUrl, eventLabel } =
    params;

  const title = emailT(locale, "supportTicket.title", { ticket: ticketNumber });
  const bodyHtml = `
    <p style="margin:0 0 12px;">${eventLabel}</p>
    <p style="margin:0 0 8px;"><strong>${emailT(locale, "supportTicket.status")}:</strong> ${status}</p>
    <p style="margin:0 0 8px;"><strong>${emailT(locale, "supportTicket.subjectLabel")}:</strong> ${subject}</p>
    <p style="margin:0 0 12px;">${summary}</p>
  `;

  const { html, text } = renderEmailLayout({
    locale,
    branding,
    title,
    bodyHtml,
    ctaLabel: emailT(locale, "supportTicket.cta"),
    ctaUrl: ticketUrl,
  });

  return {
    subject: emailT(locale, "supportTicket.subject", { ticket: ticketNumber }),
    html,
    text,
  };
}
