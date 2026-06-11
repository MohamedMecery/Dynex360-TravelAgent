import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTenantBranding, loadTenantEmailLocale } from "@/lib/email/branding";
import { sendTransactionalEmail } from "@/lib/email/email-service";
import {
  renderQuotationAcceptedEmail,
  renderQuotationRejectedEmail,
} from "@/lib/email/templates/quotation-portal";
import type { SendTransactionalEmailResult } from "@/lib/email/types";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import type { Customer } from "@/types";

interface QuotationEmailRow {
  id: string;
  quotation_number: string;
  total_amount: number;
  currency: string;
  valid_until: string | null;
  customers: Pick<Customer, "type" | "first_name" | "last_name" | "company_name"> | null;
}

async function loadQuotationForEmail(
  supabase: SupabaseClient,
  tenantId: string,
  quotationId: string
): Promise<QuotationEmailRow | null> {
  const { data, error } = await supabase
    .from("quotations")
    .select(
      "id, quotation_number, total_amount, currency, valid_until, customers(type, first_name, last_name, company_name)"
    )
    .eq("id", quotationId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as QuotationEmailRow;
}

function formatMoney(amount: number, currency: string, locale: "en" | "ar"): string {
  return amount.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
  });
}

export async function sendQuotationAcceptedEmail(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    quotationId: string;
    recipientEmail: string;
    domainEventId?: string;
  }
): Promise<SendTransactionalEmailResult> {
  const quotation = await loadQuotationForEmail(supabase, input.tenantId, input.quotationId);
  if (!quotation) {
    return { status: "skipped", errorMessage: "Quotation not found" };
  }

  const recipient = input.recipientEmail.trim();
  if (!recipient) {
    return { status: "skipped", errorMessage: "Missing recipient" };
  }

  const [branding, locale] = await Promise.all([
    loadTenantBranding(supabase, input.tenantId),
    loadTenantEmailLocale(supabase, input.tenantId),
  ]);

  const customer = quotation.customers;
  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString(
        locale === "ar" ? "ar-SA" : "en-US",
        { dateStyle: "medium" }
      )
    : "—";

  const { subject, html, text } = renderQuotationAcceptedEmail({
    locale,
    branding,
    quotationNumber: quotation.quotation_number,
    customerName: customer ? getCustomerDisplayName(customer) : "—",
    totalAmount: formatMoney(Number(quotation.total_amount), quotation.currency, locale),
    validUntil,
    portalUrl: `${branding.siteUrl}/portal/quotations/${quotation.id}`,
  });

  return sendTransactionalEmail(supabase, {
    type: "quotation_accepted",
    tenantId: input.tenantId,
    to: recipient,
    locale,
    branding,
    subject,
    html,
    text,
    domainEventId: input.domainEventId,
  });
}

export async function sendQuotationRejectedEmail(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    quotationId: string;
    recipientEmail: string;
    reason?: string;
    domainEventId?: string;
  }
): Promise<SendTransactionalEmailResult> {
  const quotation = await loadQuotationForEmail(supabase, input.tenantId, input.quotationId);
  if (!quotation) {
    return { status: "skipped", errorMessage: "Quotation not found" };
  }

  const recipient = input.recipientEmail.trim();
  if (!recipient) {
    return { status: "skipped", errorMessage: "Missing recipient" };
  }

  const [branding, locale] = await Promise.all([
    loadTenantBranding(supabase, input.tenantId),
    loadTenantEmailLocale(supabase, input.tenantId),
  ]);

  const customer = quotation.customers;
  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString(
        locale === "ar" ? "ar-SA" : "en-US",
        { dateStyle: "medium" }
      )
    : "—";

  const { subject, html, text } = renderQuotationRejectedEmail({
    locale,
    branding,
    quotationNumber: quotation.quotation_number,
    customerName: customer ? getCustomerDisplayName(customer) : "—",
    totalAmount: formatMoney(Number(quotation.total_amount), quotation.currency, locale),
    validUntil,
    portalUrl: `${branding.siteUrl}/portal/quotations/${quotation.id}`,
    reason: input.reason,
  });

  return sendTransactionalEmail(supabase, {
    type: "quotation_rejected",
    tenantId: input.tenantId,
    to: recipient,
    locale,
    branding,
    subject,
    html,
    text,
    domainEventId: input.domainEventId,
  });
}
