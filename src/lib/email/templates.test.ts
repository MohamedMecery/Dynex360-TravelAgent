import assert from "node:assert/strict";
import test from "node:test";
import { resolveEmailBranding } from "@/lib/email/branding";
import { renderBookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";
import { renderSupportTicketEmail } from "@/lib/email/templates/support-ticket";

const branding = resolveEmailBranding({
  tenantName: "Dynex Travel",
  settingsJson: { company_email: "support@dynex.test" },
});

test("welcome email renders EN with CTA", () => {
  const { html, subject } = renderWelcomeEmail({
    locale: "en",
    branding,
    userName: "Sara",
  });
  assert.match(subject, /Dynex Travel/);
  assert.match(html, /Welcome to Dynex Travel/);
  assert.match(html, /Go to dashboard/);
  assert.match(html, /support@dynex\.test/);
});

test("welcome email renders AR with RTL", () => {
  const { html } = renderWelcomeEmail({
    locale: "ar",
    branding,
    userName: "سارة",
  });
  assert.match(html, /dir="rtl"/);
  assert.match(html, /lang="ar"/);
  assert.match(html, /مرحباً/);
});

test("booking confirmation includes reference and destination", () => {
  const { html, subject } = renderBookingConfirmationEmail({
    locale: "en",
    branding,
    referenceNumber: "BK-2026-001",
    customerName: "John Doe",
    packageTitle: "Dubai Explorer",
    destinationName: "Dubai",
    travelDate: "Jun 15, 2026",
    bookingUrl: `${branding.siteUrl}/bookings/show/abc`,
  });
  assert.match(subject, /BK-2026-001/);
  assert.match(html, /Dubai Explorer/);
  assert.match(html, /View booking/);
});

test("support ticket notification renders status", () => {
  const { html } = renderSupportTicketEmail({
    locale: "en",
    branding,
    ticketNumber: "TK-100",
    status: "open",
    subject: "Refund request",
    summary: "Refund request",
    ticketUrl: `${branding.siteUrl}/ai/support/tickets/show/1`,
    eventLabel: "Assigned to you",
  });
  assert.match(html, /TK-100/);
  assert.match(html, /Open ticket/);
});
