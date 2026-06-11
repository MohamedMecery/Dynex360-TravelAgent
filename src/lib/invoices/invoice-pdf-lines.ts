import type { SupabaseClient } from "@supabase/supabase-js";
import { parseInvoiceLineItemsSnapshot } from "@/lib/invoices/line-items-snapshot";
import type { InvoiceLineItemSnapshot, InvoiceStatus } from "@/types";

/** Maximum commercial lines allowed in a single invoice PDF export. */
export const INVOICE_PDF_MAX_LINE_ITEMS = 100;

export class InvoicePdfLineLimitExceededError extends Error {
  readonly lineCount: number;
  readonly maxLines: number;

  constructor(lineCount: number, maxLines: number = INVOICE_PDF_MAX_LINE_ITEMS) {
    super(
      `This invoice has ${lineCount} line items. PDF export supports a maximum of ${maxLines} lines.`
    );
    this.name = "InvoicePdfLineLimitExceededError";
    this.lineCount = lineCount;
    this.maxLines = maxLines;
  }
}

/** Issued and post-issue statuses must use frozen snapshot only (D-012). */
export function invoicePdfUsesSnapshot(status: InvoiceStatus): boolean {
  return status !== "draft";
}

export async function resolveInvoicePdfLineItems(
  supabase: SupabaseClient,
  invoiceId: string,
  bookingId: string,
  status: InvoiceStatus,
  lineItemsSnapshot: unknown
): Promise<InvoiceLineItemSnapshot[]> {
  if (invoicePdfUsesSnapshot(status)) {
    return parseInvoiceLineItemsSnapshot(lineItemsSnapshot) ?? [];
  }

  const { data, error } = await supabase
    .from("booking_items")
    .select("id, description, quantity, unit_price, total_price")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load booking line items: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    total_price: Number(row.total_price),
  }));
}
