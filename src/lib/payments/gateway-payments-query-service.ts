import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentAttemptRecord, PaymentOrderRecord } from "@/lib/payments/types";

export type GatewayOrderView = PaymentOrderRecord & {
  attempts: PaymentAttemptRecord[];
  ledger_total: number;
};

export interface GatewayPaymentSummary {
  orders: GatewayOrderView[];
}

async function enrichOrders(
  supabase: SupabaseClient,
  orders: PaymentOrderRecord[],
  bookingIdForLedger?: string
): Promise<GatewayOrderView[]> {
  return Promise.all(
    orders.map(async (order) => {
      const { data: attempts } = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("payment_order_id", order.id)
        .order("created_at", { ascending: false });

      let ledgerQuery = supabase
        .from("payments")
        .select("amount")
        .eq("payment_order_id", order.id)
        .is("deleted_at", null);

      if (bookingIdForLedger) {
        ledgerQuery = ledgerQuery.eq("booking_id", bookingIdForLedger);
      }

      const { data: ledger } = await ledgerQuery;
      const ledger_total = (ledger ?? []).reduce(
        (sum, row) => sum + Number(row.amount),
        0
      );

      return {
        ...order,
        attempts: (attempts ?? []) as PaymentAttemptRecord[],
        ledger_total,
      };
    })
  );
}

export async function fetchGatewayPaymentsForQuotation(
  tenantId: string,
  quotationId: string,
  supabase: SupabaseClient = createAdminClient()
): Promise<GatewayPaymentSummary> {
  const { data: orders, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("quotation_id", quotationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return {
    orders: await enrichOrders(
      supabase,
      (orders ?? []) as PaymentOrderRecord[]
    ),
  };
}

export async function fetchGatewayPaymentsForBooking(
  tenantId: string,
  bookingId: string,
  supabase: SupabaseClient = createAdminClient()
): Promise<GatewayPaymentSummary> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("quotation_id")
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const orderMap = new Map<string, PaymentOrderRecord>();

  const { data: byBooking } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);

  for (const row of byBooking ?? []) {
    orderMap.set(row.id as string, row as PaymentOrderRecord);
  }

  if (booking?.quotation_id) {
    const { data: byQuote } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("quotation_id", booking.quotation_id as string);

    for (const row of byQuote ?? []) {
      orderMap.set(row.id as string, row as PaymentOrderRecord);
    }
  }

  const orders = [...orderMap.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    orders: await enrichOrders(supabase, orders, bookingId),
  };
}

export async function fetchGatewayPaymentsForCustomer(
  tenantId: string,
  customerId: string,
  supabase: SupabaseClient = createAdminClient()
): Promise<GatewayPaymentSummary> {
  const { data: orders, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return {
    orders: await enrichOrders(
      supabase,
      (orders ?? []) as PaymentOrderRecord[]
    ),
  };
}
