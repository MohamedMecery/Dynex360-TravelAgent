import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { hasInvoicesPermission } from "@/lib/auth/invoices-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import {
  fetchInvoicePdfViewModel,
  InvoicePdfNotFoundError,
} from "@/lib/invoices/invoice-pdf-data";
import { InvoicePdfLineLimitExceededError } from "@/lib/invoices/invoice-pdf-lines";
import {
  buildInvoicePdfFilename,
  renderInvoicePdfBuffer,
} from "@/lib/invoices/invoice-pdf-service";
import { isActiveLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";

type RouteParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const maxDuration = 30;

async function resolvePdfLocale(request: NextRequest): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isActiveLocale(cookieLocale)) {
    return cookieLocale;
  }

  const queryLocale = request.nextUrl.searchParams.get("locale");
  if (queryLocale && isActiveLocale(queryLocale)) {
    return queryLocale;
  }

  return "en";
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, access } = gate;
    if (!hasInvoicesPermission(access.role, "invoices.read")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing invoices.read permission" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const locale = await resolvePdfLocale(request);

    const model = await fetchInvoicePdfViewModel(supabase, access.tenantId, id, locale);
    const pdfBuffer = await renderInvoicePdfBuffer(model);
    const filename = buildInvoicePdfFilename(model.invoiceNumber);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof InvoicePdfNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (error instanceof InvoicePdfLineLimitExceededError) {
      return NextResponse.json(
        {
          error: {
            code: "LINE_LIMIT_EXCEEDED",
            message: error.message,
            details: { lineCount: error.lineCount, maxLines: error.maxLines },
          },
        },
        { status: 422 }
      );
    }

    console.error("Invoice PDF error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate invoice PDF",
        },
      },
      { status: 500 }
    );
  }
}
