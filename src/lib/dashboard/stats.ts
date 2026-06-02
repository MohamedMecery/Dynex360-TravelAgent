import { SupabaseClient } from "@supabase/supabase-js";
import { BookingStatus, PaymentStatus } from "@/types";

export interface DashboardRecentBooking {
  id: string;
  reference_number: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  currency: string;
  created_at: string;
}

export interface DashboardStats {
  bookings_by_status: Record<BookingStatus, number>;
  total_revenue: number | null;
  outstanding_balance: number | null;
  recent_bookings: DashboardRecentBooking[];
}

const EMPTY_STATUS_COUNTS: Record<BookingStatus, number> = {
  draft: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
};

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  options: { includeFinancial: boolean }
): Promise<DashboardStats> {
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, reference_number, status, payment_status, total_amount, currency, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const rows = bookings ?? [];
  const bookingsByStatus = { ...EMPTY_STATUS_COUNTS };
  for (const booking of rows) {
    const status = booking.status as BookingStatus;
    if (status in bookingsByStatus) {
      bookingsByStatus[status] += 1;
    }
  }

  const recentBookings: DashboardRecentBooking[] = rows.slice(0, 10).map((b) => ({
    id: b.id,
    reference_number: b.reference_number,
    status: b.status as BookingStatus,
    payment_status: b.payment_status as PaymentStatus,
    total_amount: Number(b.total_amount),
    currency: b.currency,
    created_at: b.created_at,
  }));

  if (!options.includeFinancial) {
    return {
      bookings_by_status: bookingsByStatus,
      total_revenue: null,
      outstanding_balance: null,
      recent_bookings: recentBookings,
    };
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount")
    .is("deleted_at", null);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const totalRevenue = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalBooked = rows
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const outstandingBalance = Math.max(0, totalBooked - totalRevenue);

  return {
    bookings_by_status: bookingsByStatus,
    total_revenue: totalRevenue,
    outstanding_balance: outstandingBalance,
    recent_bookings: recentBookings,
  };
}
