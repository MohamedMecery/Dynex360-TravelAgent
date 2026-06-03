import type { InvoiceLineItemSnapshot } from "@/types";
import { sumBookingItemsSubtotal } from "@/lib/invoices/booking-subtotal";

/** Normalize JSONB snapshot from Supabase into typed line rows. */
export function parseInvoiceLineItemsSnapshot(
  raw: unknown
): InvoiceLineItemSnapshot[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : `snap-${index}`,
      description: String(item.description ?? ""),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
    };
  });
}

export function sumInvoiceLineItemsSnapshot(
  items: InvoiceLineItemSnapshot[]
): number {
  return sumBookingItemsSubtotal(items);
}
