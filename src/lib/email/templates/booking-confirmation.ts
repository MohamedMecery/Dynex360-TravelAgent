import { emailT, type EmailLocale } from "@/lib/email/messages";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import type { EmailBrandingContext } from "@/lib/email/types";

export interface BookingConfirmationEmailParams {
  locale: EmailLocale;
  branding: EmailBrandingContext;
  referenceNumber: string;
  customerName: string;
  packageTitle: string;
  destinationName: string;
  travelDate: string;
  bookingUrl: string;
}

export function renderBookingConfirmationEmail(
  params: BookingConfirmationEmailParams
): { subject: string; html: string; text: string } {
  const {
    locale,
    branding,
    referenceNumber,
    customerName,
    packageTitle,
    destinationName,
    travelDate,
    bookingUrl,
  } = params;

  const title = emailT(locale, "bookingConfirmation.title");
  const bodyHtml = `
    <p style="margin:0 0 16px;">${emailT(locale, "bookingConfirmation.intro")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "bookingConfirmation.reference")}</td><td style="padding:6px 0;font-weight:600;">${referenceNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "bookingConfirmation.customer")}</td><td style="padding:6px 0;">${customerName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "bookingConfirmation.package")}</td><td style="padding:6px 0;">${packageTitle}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "bookingConfirmation.destination")}</td><td style="padding:6px 0;">${destinationName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">${emailT(locale, "bookingConfirmation.travelDate")}</td><td style="padding:6px 0;">${travelDate}</td></tr>
    </table>
  `;

  const { html, text } = renderEmailLayout({
    locale,
    branding,
    title,
    bodyHtml,
    ctaLabel: emailT(locale, "bookingConfirmation.cta"),
    ctaUrl: bookingUrl,
  });

  return {
    subject: emailT(locale, "bookingConfirmation.subject", { reference: referenceNumber }),
    html,
    text,
  };
}
