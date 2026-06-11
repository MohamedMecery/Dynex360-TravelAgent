import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getPortalBookingDocument } from "@/lib/portal/portal-booking-documents-service";

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id, documentId } = await context.params;

  try {
    const document = await getPortalBookingDocument(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      id,
      documentId
    );

    return NextResponse.redirect(document.file_url, { status: 302 });
  } catch (err) {
    const notFound =
      err && typeof err === "object" && "code" in err && err.code === "NOT_FOUND";
    const message = err instanceof Error ? err.message : "Document not found";
    return NextResponse.json(
      { error: { code: notFound ? "NOT_FOUND" : "INTERNAL", message } },
      { status: notFound ? 404 : 500 }
    );
  }
}
