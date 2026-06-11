import type {
  QuotationCreateInput,
  QuotationItemInput,
  QuotationUpdateInput,
} from "@/lib/validation/quotation";
import type { Quotation, QuotationItem } from "@/types";

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class QuotationApiError extends Error {
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
    throw new QuotationApiError(
      body.error?.message ?? response.statusText,
      body.error?.code ?? "ERROR",
      body.error?.details
    );
  }
  return body;
}

export async function apiCreateQuotation(
  input: QuotationCreateInput
): Promise<Quotation> {
  const body = await parseJson<{ data: Quotation }>(
    await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiGetQuotation(id: string): Promise<Quotation> {
  const body = await parseJson<{ data: Quotation }>(
    await fetch(`/api/quotations/${id}`)
  );
  return body.data;
}

export async function apiUpdateQuotation(
  id: string,
  input: QuotationUpdateInput
): Promise<Quotation> {
  const body = await parseJson<{ data: Quotation }>(
    await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiDeleteQuotation(id: string): Promise<void> {
  await parseJson<{ data: null }>(
    await fetch(`/api/quotations/${id}`, { method: "DELETE" })
  );
}

async function postAction(id: string, action: string, body?: unknown): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}/${action}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const parsed = await parseJson<{ data: Quotation }>(res);
  return parsed.data;
}

export const apiSendQuotation = (id: string): Promise<Quotation> =>
  postAction(id, "send");

export const apiAcceptQuotation = (id: string): Promise<Quotation> =>
  postAction(id, "accept");

export const apiRejectQuotation = (
  id: string,
  reason?: string
): Promise<Quotation> =>
  postAction(id, "reject", reason ? { reason } : undefined);

export const apiMarkQuotationViewed = (id: string): Promise<Quotation> =>
  postAction(id, "mark-viewed");

export const apiSubmitQuotationApproval = (id: string): Promise<Quotation> =>
  postAction(id, "submit-approval");

export const apiApproveQuotation = (id: string): Promise<Quotation> =>
  postAction(id, "approve");

export const apiRejectQuotationApproval = (id: string): Promise<Quotation> =>
  postAction(id, "reject-approval");

export async function apiConvertQuotationToBooking(id: string): Promise<{
  quotation: Quotation;
  booking_id: string;
  reference_number: string;
  redirect_url: string;
}> {
  const body = await parseJson<{
    data: {
      quotation: Quotation;
      booking_id: string;
      reference_number: string;
      redirect_url: string;
    };
  }>(await fetch(`/api/quotations/${id}/convert`, { method: "POST" }));
  return body.data;
}

export async function apiAddQuotationItem(
  quotationId: string,
  input: QuotationItemInput
): Promise<QuotationItem> {
  const body = await parseJson<{ data: QuotationItem }>(
    await fetch(`/api/quotations/${quotationId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}
