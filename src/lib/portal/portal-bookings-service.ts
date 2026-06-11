import type { SupabaseClient } from "@supabase/supabase-js";
import { PORTAL_ACTIVE_BOOKING_STATUSES } from "@/lib/portal/constants";
import type {
  Booking,
  BookingItem,
  BookingStatusHistoryEntry,
  BookingTravelerRow,
} from "@/types";

const LIST_SELECT =
  "id, tenant_id, reference_number, customer_id, package_id, quotation_id, status, payment_status, total_amount, currency, travel_date, created_at, updated_at, packages(id, title)";

const DETAIL_SELECT =
  "id, tenant_id, reference_number, customer_id, package_id, quotation_id, status, payment_status, total_amount, currency, travel_date, notes, created_at, updated_at, packages(id, title, destination_id, destinations(name))";

export interface PortalBookingListItem extends Omit<Booking, "packages"> {
  packages?: { id: string; title: string } | null;
}

export interface PortalBookingDetail extends PortalBookingListItem {
  booking_items: BookingItem[];
  booking_travelers: BookingTravelerRow[];
  booking_status_history: BookingStatusHistoryEntry[];
}

export async function listPortalBookings(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<{ data: PortalBookingListItem[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("bookings")
    .select(LIST_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return { data: (data ?? []) as unknown as PortalBookingListItem[], total: count ?? 0 };
}

export async function getPortalBookingById(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  bookingId: string
): Promise<PortalBookingDetail> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(DETAIL_SELECT)
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
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
        "id, booking_id, traveler_id, tenant_id, is_lead, price_tier, travelers(id, first_name, last_name, date_of_birth, gender, passport_number)"
      )
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId),
    supabase
      .from("booking_status_history")
      .select("id, booking_id, tenant_id, from_status, to_status, notes, created_at")
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (travelersRes.error) throw new Error(travelersRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  return {
    ...(booking as unknown as PortalBookingListItem),
    booking_items: (itemsRes.data ?? []) as BookingItem[],
    booking_travelers: (travelersRes.data ?? []) as unknown as BookingTravelerRow[],
    booking_status_history: (historyRes.data ?? []) as BookingStatusHistoryEntry[],
  };
}

export async function countActivePortalBookings(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", [...PORTAL_ACTIVE_BOOKING_STATUSES])
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
