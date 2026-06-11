import type { Customer360Payload, Customer360TimelinePage } from "@/lib/crm/customer-360-types";
import type { TimelineBucket } from "@/lib/crm/timeline-events";

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class Customer360ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Customer360ApiError(
      body.error?.message ?? response.statusText,
      body.error?.code ?? "ERROR",
      body.error?.details
    );
  }
  return body;
}

export async function apiGetCustomer360(
  customerId: string
): Promise<Customer360Payload> {
  const body = await parseJson<{ data: Customer360Payload }>(
    await fetch(`/api/customers/${customerId}/360`, { credentials: "include" })
  );
  return body.data;
}

export interface FetchCustomerTimelineParams {
  limit?: number;
  cursor?: string | null;
  bucket?: TimelineBucket;
}

export async function apiGetCustomer360Timeline(
  customerId: string,
  params: FetchCustomerTimelineParams = {}
): Promise<Customer360TimelinePage> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.bucket && params.bucket !== "all") qs.set("bucket", params.bucket);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const body = await parseJson<{
    data: Customer360TimelinePage["data"];
    meta: Customer360TimelinePage["meta"];
  }>(
    await fetch(`/api/customers/${customerId}/360/timeline${suffix}`, {
      credentials: "include",
    })
  );
  return { data: body.data, meta: body.meta };
}
