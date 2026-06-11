import { apiFetch } from "@/lib/api-client";
import type { PaginatedMeta } from "@/types/crm";
import type {
  BookingDetail,
  BookingListItem,
  BookingStatus,
  Customer360Payload,
  Customer360TimelinePage,
  Quotation,
  QuotationCreateInput,
  QuotationItem,
  QuotationItemInput,
  QuotationUpdateInput,
} from "@/types/revenue";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function fetchQuotations(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  opportunity_id?: string;
  customer_id?: string;
}): Promise<{ data: Quotation[]; meta: PaginatedMeta }> {
  return apiFetch(`/api/quotations${buildQuery(params)}`);
}

export async function fetchQuotation(id: string): Promise<Quotation> {
  const body = await apiFetch<{ data: Quotation }>(`/api/quotations/${id}`);
  return body.data;
}

export async function createQuotation(input: QuotationCreateInput): Promise<Quotation> {
  const body = await apiFetch<{ data: Quotation }>("/api/quotations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function updateQuotation(
  id: string,
  input: QuotationUpdateInput
): Promise<Quotation> {
  const body = await apiFetch<{ data: Quotation }>(`/api/quotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.data;
}

async function quotationAction(id: string, action: string, body?: unknown): Promise<Quotation> {
  const res = await apiFetch<{ data: Quotation }>(`/api/quotations/${id}/${action}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.data;
}

export const sendQuotation = (id: string) => quotationAction(id, "send");
export const acceptQuotation = (id: string) => quotationAction(id, "accept");
export const rejectQuotation = (id: string, reason?: string) =>
  quotationAction(id, "reject", reason ? { reason } : undefined);
export const markQuotationViewed = (id: string) => quotationAction(id, "mark-viewed");
export const submitQuotationApproval = (id: string) => quotationAction(id, "submit-approval");
export const approveQuotation = (id: string) => quotationAction(id, "approve");
export const rejectQuotationApproval = (id: string) => quotationAction(id, "reject-approval");

export async function convertQuotation(id: string): Promise<{
  quotation: Quotation;
  booking_id: string;
  reference_number: string;
}> {
  const body = await apiFetch<{
    data: {
      quotation: Quotation;
      booking_id: string;
      reference_number: string;
    };
  }>(`/api/quotations/${id}/convert`, { method: "POST" });
  return body.data;
}

export async function addQuotationItem(
  quotationId: string,
  input: QuotationItemInput
): Promise<QuotationItem> {
  const body = await apiFetch<{ data: QuotationItem }>(
    `/api/quotations/${quotationId}/items`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return body.data;
}

export async function updateQuotationItem(
  quotationId: string,
  itemId: string,
  input: Partial<QuotationItemInput>
): Promise<QuotationItem> {
  const body = await apiFetch<{ data: QuotationItem }>(
    `/api/quotations/${quotationId}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
  return body.data;
}

export async function deleteQuotationItem(
  quotationId: string,
  itemId: string
): Promise<void> {
  await apiFetch(`/api/quotations/${quotationId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function fetchCustomer360(customerId: string): Promise<Customer360Payload> {
  const body = await apiFetch<{ data: Customer360Payload }>(
    `/api/customers/${customerId}/360`
  );
  return body.data;
}

export async function fetchCustomer360Timeline(
  customerId: string,
  params: { limit?: number; cursor?: string | null; bucket?: string } = {}
): Promise<Customer360TimelinePage> {
  const qs = buildQuery({
    limit: params.limit,
    cursor: params.cursor ?? undefined,
    bucket: params.bucket,
  });
  const body = await apiFetch<{
    data: Customer360TimelinePage["data"];
    meta: Customer360TimelinePage["meta"];
  }>(`/api/customers/${customerId}/360/timeline${qs}`);
  return { data: body.data, meta: body.meta };
}

export async function fetchBookings(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ data: BookingListItem[]; meta: PaginatedMeta }> {
  return apiFetch(`/api/bookings${buildQuery(params)}`);
}

export async function fetchBooking(id: string): Promise<BookingDetail> {
  const body = await apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}`);
  return body.data;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<BookingDetail> {
  const body = await apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return body.data;
}
