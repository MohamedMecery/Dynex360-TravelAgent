import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getPortalQuotationById } from "@/lib/portal/portal-quotations-service";
import {
  buildQuotationPdfFilename,
  renderQuotationPdfBuffer,
} from "@/lib/portal/quotation-pdf-service";
import { buildQuotationPdfViewModel, QuotationPdfNotFoundError } from "@/lib/portal/quotation-pdf-types";
import { isActiveLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";
import type { Customer } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

async function resolvePdfLocale(request: NextRequest): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isActiveLocale(cookieLocale)) return cookieLocale;

  const queryLocale = request.nextUrl.searchParams.get("locale");
  if (queryLocale && isActiveLocale(queryLocale)) return queryLocale;

  return "en";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const locale = await resolvePdfLocale(request);

  try {
    const quotation = await getPortalQuotationById(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      id
    );

    const [customerRes, tenantRes, settingsRes] = await Promise.all([
      ctx.supabase
        .from("customers")
        .select("id, tenant_id, type, first_name, last_name, company_name")
        .eq("id", ctx.customerId)
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle(),
      ctx.supabase.from("tenants").select("name").eq("id", ctx.tenantId).maybeSingle(),
      ctx.supabase
        .from("tenant_settings")
        .select("settings")
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle(),
    ]);

    if (!customerRes.data) throw new QuotationPdfNotFoundError();

    const model = await buildQuotationPdfViewModel(
      quotation,
      customerRes.data as Customer,
      (tenantRes.data?.name as string) ?? "TravelOS",
      (settingsRes.data?.settings as Record<string, unknown> | null) ?? null,
      locale
    );

    const pdfBuffer = await renderQuotationPdfBuffer(model);
    const filename = buildQuotationPdfFilename(quotation.quotation_number);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof QuotationPdfNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Quotation not found" } },
        { status: 404 }
      );
    }
    console.error("Portal quotation PDF error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Failed to generate PDF" } },
      { status: 500 }
    );
  }
}
