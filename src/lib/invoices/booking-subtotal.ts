import type { BookingItem } from "@/types";

export type InvoiceSubtotalSource = "line_items" | "booking_total";

/** Sum `booking_items.total_price` for invoice subtotal (D-011). */
export function sumBookingItemsSubtotal(
  items: Pick<BookingItem, "total_price">[]
): number {
  return items.reduce((sum, item) => sum + Number(item.total_price), 0);
}

/**
 * Prefer line-item sum when items exist; otherwise fall back to `bookings.total_amount`.
 * `bookings.total_amount` is trigger-maintained and should match items when present.
 */
export function resolveInvoiceSubtotalFromBooking(
  items: Pick<BookingItem, "total_price">[],
  bookingTotalAmount: number
): { subtotal: number; source: InvoiceSubtotalSource } {
  const linesSum = sumBookingItemsSubtotal(items);
  if (items.length > 0) {
    return { subtotal: linesSum, source: "line_items" };
  }
  return {
    subtotal: Number(bookingTotalAmount) || 0,
    source: "booking_total",
  };
}
