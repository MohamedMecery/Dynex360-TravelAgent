import type { SupabaseClient } from "@supabase/supabase-js";

export interface BookingDocumentRow {
  id: string;
  booking_id: string;
  tenant_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export async function listPortalBookingDocuments(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  bookingId: string
): Promise<BookingDocumentRow[]> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("customer_id", customerId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (bookingError) throw new Error(bookingError.message);
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
  }

  const { data, error } = await supabase
    .from("booking_documents")
    .select("id, booking_id, tenant_id, file_url, file_name, file_type, file_size, created_at")
    .eq("booking_id", bookingId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BookingDocumentRow[];
}

export async function getPortalBookingDocument(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  bookingId: string,
  documentId: string
): Promise<BookingDocumentRow> {
  const docs = await listPortalBookingDocuments(
    supabase,
    customerId,
    tenantId,
    bookingId
  );
  const doc = docs.find((d) => d.id === documentId);
  if (!doc) {
    throw Object.assign(new Error("Document not found"), { code: "NOT_FOUND" });
  }
  return doc;
}
