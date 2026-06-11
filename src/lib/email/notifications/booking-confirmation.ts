import { SupabaseClient } from "@supabase/supabase-js";
import { loadTenantBranding, loadTenantEmailLocale } from "@/lib/email/branding";
import { sendTransactionalEmail } from "@/lib/email/email-service";
import { renderBookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";
import type { SendTransactionalEmailResult } from "@/lib/email/types";

function formatCustomerName(customer: {
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null): string {
  if (!customer) return "—";
  if (customer.company_name?.trim()) return customer.company_name.trim();
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  return name || "—";
}

export async function sendBookingConfirmationEmail(
  supabase: SupabaseClient,
  input: { tenantId: string; bookingId: string }
): Promise<SendTransactionalEmailResult> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      reference_number,
      travel_date,
      tenant_id,
      customers ( email, first_name, last_name, company_name ),
      packages ( title, destinations ( name ) )
    `
    )
    .eq("id", input.bookingId)
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !booking) {
    return {
      status: "skipped",
      errorMessage: error?.message ?? "Booking not found",
    };
  }

  const customer = booking.customers as {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;

  const recipient = customer?.email?.trim();
  if (!recipient) {
    return { status: "skipped", errorMessage: "Customer has no email" };
  }

  const pkg = booking.packages as {
    title?: string;
    destinations?: { name?: string } | null;
  } | null;

  const [branding, locale] = await Promise.all([
    loadTenantBranding(supabase, input.tenantId),
    loadTenantEmailLocale(supabase, input.tenantId),
  ]);

  const travelDate = booking.travel_date
    ? new Date(String(booking.travel_date)).toLocaleDateString(
        locale === "ar" ? "ar-SA" : "en-US",
        { dateStyle: "medium" }
      )
    : "—";

  const { subject, html, text } = renderBookingConfirmationEmail({
    locale,
    branding,
    referenceNumber: booking.reference_number,
    customerName: formatCustomerName(customer),
    packageTitle: pkg?.title ?? "—",
    destinationName: pkg?.destinations?.name ?? "—",
    travelDate,
    bookingUrl: `${branding.siteUrl}/bookings/show/${booking.id}`,
  });

  return sendTransactionalEmail(supabase, {
    type: "booking_confirmation",
    tenantId: input.tenantId,
    to: recipient,
    locale,
    branding,
    subject,
    html,
    text,
  });
}
