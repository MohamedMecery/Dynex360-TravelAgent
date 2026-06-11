import type { SupabaseClient } from "@supabase/supabase-js";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { countActivePortalBookings } from "@/lib/portal/portal-bookings-service";
import { countOpenPortalQuotations } from "@/lib/portal/portal-quotations-service";
import type { Customer } from "@/types";

export interface PortalActivityItem {
  id: string;
  type: "quotation" | "booking";
  title: string;
  status: string;
  occurred_at: string;
  href: string;
}

export interface PortalDashboardData {
  customer: Customer & { display_name: string };
  open_quotations_count: number;
  active_bookings_count: number;
  recent_activity: PortalActivityItem[];
}

export async function getPortalDashboard(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string
): Promise<PortalDashboardData> {
  const [customerRes, openQuotes, activeBookings, recentQuotes, recentBookings] =
    await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, tenant_id, type, first_name, last_name, company_name, email, phone, created_at, updated_at"
        )
        .eq("id", customerId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .maybeSingle(),
      countOpenPortalQuotations(supabase, customerId, tenantId),
      countActivePortalBookings(supabase, customerId, tenantId),
      supabase
        .from("quotations")
        .select("id, quotation_number, status, sent_at, viewed_at, accepted_at, created_at")
        .eq("customer_id", customerId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("bookings")
        .select("id, reference_number, status, created_at, updated_at")
        .eq("customer_id", customerId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  if (customerRes.error) throw new Error(customerRes.error.message);
  if (!customerRes.data) {
    throw Object.assign(new Error("Customer not found"), { code: "NOT_FOUND" });
  }

  const customer = customerRes.data as Customer;
  const activity: PortalActivityItem[] = [];

  for (const q of recentQuotes.data ?? []) {
    const occurred =
      (q.accepted_at as string | null) ??
      (q.viewed_at as string | null) ??
      (q.sent_at as string | null) ??
      (q.created_at as string);
    activity.push({
      id: q.id as string,
      type: "quotation",
      title: q.quotation_number as string,
      status: q.status as string,
      occurred_at: occurred,
      href: `/portal/quotations/${q.id}`,
    });
  }

  for (const b of recentBookings.data ?? []) {
    activity.push({
      id: b.id as string,
      type: "booking",
      title: b.reference_number as string,
      status: b.status as string,
      occurred_at: (b.updated_at ?? b.created_at) as string,
      href: `/portal/bookings/${b.id}`,
    });
  }

  activity.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  return {
    customer: {
      ...customer,
      display_name: getCustomerDisplayName(customer),
    },
    open_quotations_count: openQuotes,
    active_bookings_count: activeBookings,
    recent_activity: activity.slice(0, 8),
  };
}

export async function getPortalProfile(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  portalEmail: string
): Promise<{ customer: Customer & { display_name: string }; portal_email: string }> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, tenant_id, type, first_name, last_name, company_name, email, phone, notes, created_at, updated_at"
    )
    .eq("id", customerId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw Object.assign(new Error("Customer not found"), { code: "NOT_FOUND" });
  }

  const customer = data as Customer;
  return {
    customer: { ...customer, display_name: getCustomerDisplayName(customer) },
    portal_email: portalEmail,
  };
}
