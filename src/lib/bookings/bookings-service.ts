import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingListQuery } from "@/lib/validation/booking-api";
import type {
  Booking,
  BookingItem,
  BookingStatusHistoryEntry,
  BookingTravelerRow,
} from "@/types";

const LIST_SELECT =
  "id, tenant_id, reference_number, customer_id, package_id, quotation_id, status, payment_status, total_amount, currency, travel_date, notes, created_at, updated_at, customers(id, first_name, last_name, email), packages(id, title)";

const DETAIL_SELECT =
  "id, tenant_id, reference_number, customer_id, package_id, quotation_id, status, payment_status, total_amount, currency, travel_date, notes, created_at, updated_at, created_by, updated_by, customers(id, first_name, last_name, email, phone), packages(id, title, destination_id, destinations(name))";

export interface BookingListItem extends Booking {
  quotation_id?: string | null;
}

export interface BookingDetail extends BookingListItem {
  booking_items: BookingItem[];
  booking_travelers: BookingTravelerRow[];
  booking_status_history: BookingStatusHistoryEntry[];
}

export async function listBookings(
  supabase: SupabaseClient,
  tenantId: string,
  params: BookingListQuery
): Promise<{ data: BookingListItem[]; total: number }> {
  const page = params.page;
  const limit = params.limit;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("bookings")
    .select(LIST_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.payment_status) {
    query = query.eq("payment_status", params.payment_status);
  }
  if (params.customer_id) {
    query = query.eq("customer_id", params.customer_id);
  }
  if (params.date_from) {
    query = query.gte("travel_date", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("travel_date", params.date_to);
  }
  if (params.search?.trim()) {
    const term = `%${params.search.trim().replace(/,/g, " ")}%`;
    query = query.ilike("reference_number", term);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return { data: (data ?? []) as unknown as BookingListItem[], total: count ?? 0 };
}

export async function getBookingById(
  supabase: SupabaseClient,
  tenantId: string,
  bookingId: string
): Promise<BookingDetail> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(DETAIL_SELECT)
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (bookingError) {
    throw new Error(bookingError.message);
  }
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
  }

  const [itemsRes, travelersRes, historyRes] = await Promise.all([
    supabase
      .from("booking_items")
      .select("id, booking_id, tenant_id, description, quantity, unit_price, total_price, created_at")
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("booking_travelers")
      .select(
        "id, booking_id, tenant_id, traveler_id, is_lead, price_tier, travelers(first_name, last_name)"
      )
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId),
    supabase
      .from("booking_status_history")
      .select(
        "id, booking_id, tenant_id, from_status, to_status, changed_by, notes, created_at"
      )
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (itemsRes.error) {
    throw new Error(itemsRes.error.message);
  }
  if (travelersRes.error) {
    throw new Error(travelersRes.error.message);
  }
  if (historyRes.error) {
    throw new Error(historyRes.error.message);
  }

  return {
    ...(booking as unknown as BookingListItem),
    booking_items: (itemsRes.data ?? []) as BookingItem[],
    booking_travelers: (travelersRes.data ?? []) as unknown as BookingTravelerRow[],
    booking_status_history: (historyRes.data ?? []) as BookingStatusHistoryEntry[],
  };
}
