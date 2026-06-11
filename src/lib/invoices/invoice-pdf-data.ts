import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { resolveInvoicePdfBranding } from "@/lib/invoices/pdf/branding";
import {
  loadInvoicePdfLabels,
  translateInvoiceStatus,
} from "@/lib/invoices/invoice-pdf-i18n";
import {
  INVOICE_PDF_MAX_LINE_ITEMS,
  InvoicePdfLineLimitExceededError,
  resolveInvoicePdfLineItems,
} from "@/lib/invoices/invoice-pdf-lines";
import type { InvoicePdfViewModel } from "@/lib/invoices/invoice-pdf-types";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer, InvoiceStatus } from "@/types";

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface InvoicePdfBookingJoin {
  reference_number: string;
  travel_date: string | null;
  customers: Pick<
    Customer,
    "type" | "first_name" | "last_name" | "company_name" | "email" | "phone"
  > | Pick<
    Customer,
    "type" | "first_name" | "last_name" | "company_name" | "email" | "phone"
  >[] | null;
  packages: {
    title: string;
    destinations: { name: string } | { name: string }[] | null;
  } | {
    title: string;
    destinations: { name: string } | { name: string }[] | null;
  }[] | null;
}

interface InvoicePdfRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  line_items_snapshot: unknown;
  bookings: InvoicePdfBookingJoin | InvoicePdfBookingJoin[] | null;
}

export class InvoicePdfNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoicePdfNotFoundError";
  }
}

export async function fetchInvoicePdfViewModel(
  supabase: SupabaseClient,
  tenantId: string,
  invoiceId: string,
  locale: Locale
): Promise<InvoicePdfViewModel> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `id, tenant_id, booking_id, invoice_number, status, issue_date, due_date,
       subtotal, tax_amount, total_amount, currency, notes, line_items_snapshot,
       bookings (
         reference_number, travel_date,
         customers (type, first_name, last_name, company_name, email, phone),
         packages (title, destinations (name))
       )`
    )
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (invoiceError) {
    throw new Error(`Failed to load invoice: ${invoiceError.message}`);
  }
  if (!invoice) {
    throw new InvoicePdfNotFoundError();
  }

  const row = invoice as unknown as InvoicePdfRow;
  const booking = unwrapJoin(row.bookings);
  const customer = unwrapJoin(booking?.customers) as Customer | null;
  const pkg = unwrapJoin(booking?.packages);
  const destination = unwrapJoin(pkg?.destinations);

  const [{ data: tenant }, { data: tenantSettings }, labels, messages] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.from("tenant_settings").select("settings").eq("tenant_id", tenantId).maybeSingle(),
    loadInvoicePdfLabels(locale),
    import(`../../../messages/${locale}.json`).then((m) => m.default as Record<string, unknown>),
  ]);

  const settingsJson =
    tenantSettings?.settings && typeof tenantSettings.settings === "object"
      ? (tenantSettings.settings as Record<string, unknown>)
      : null;

  const branding = resolveInvoicePdfBranding(tenant?.name ?? "TravelOS", settingsJson);
  const lineItems = await resolveInvoicePdfLineItems(
    supabase,
    invoiceId,
    row.booking_id,
    row.status,
    row.line_items_snapshot
  );

  if (lineItems.length > INVOICE_PDF_MAX_LINE_ITEMS) {
    throw new InvoicePdfLineLimitExceededError(lineItems.length);
  }

  const isDraft = row.status === "draft";
  const na = labels.notAvailable;
  const formatOptionalDate = (value: string | null): string =>
    value ? formatDate(value, locale) : na;

  return {
    locale,
    isDraft,
    showDraftWatermark: isDraft,
    branding,
    labels,
    statusLabel: translateInvoiceStatus(locale, row.status, messages),
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    customerName: customer ? getCustomerDisplayName(customer) : na,
    customerEmail: customer?.email?.trim() || null,
    customerPhone: customer?.phone?.trim() || null,
    bookingReference: booking?.reference_number ?? null,
    packageTitle: pkg?.title ?? null,
    destinationName: destination?.name ?? null,
    travelDate: booking?.travel_date ?? null,
    lineItems,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    discountAmount: null,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    notes: row.notes?.trim() || null,
    formatted: {
      issueDate: formatOptionalDate(row.issue_date),
      dueDate: formatOptionalDate(row.due_date),
      travelDate: formatOptionalDate(booking?.travel_date ?? null),
      subtotal: formatCurrency(Number(row.subtotal), row.currency, locale),
      tax: formatCurrency(Number(row.tax_amount), row.currency, locale),
      discount: null,
      total: formatCurrency(Number(row.total_amount), row.currency, locale),
      lineItems: lineItems.map((item) => ({
        unitPrice: formatCurrency(Number(item.unit_price), row.currency, locale),
        lineTotal: formatCurrency(Number(item.total_price), row.currency, locale),
      })),
    },
  };
}
