import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchAiAnalytics } from "@/lib/ai/analytics/fetch-analytics";
import { resolveAnalyticsPeriod } from "@/lib/ai/analytics/period";
import { analyticsQuerySchema } from "@/lib/ai/analytics/validation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, access } = gate;
    const { role } = access;

    if (!hasAiPermission(role, "ai.analytics.read")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.analytics.read permission" } },
        { status: 403 }
      );
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = analyticsQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    let period;
    try {
      period = resolveAnalyticsPeriod(
        parsed.data.preset,
        parsed.data.from,
        parsed.data.to
      );
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: err instanceof Error ? err.message : "Invalid date range",
          },
        },
        { status: 400 }
      );
    }

    const locale = request.headers.get("accept-language")?.toLowerCase().includes("ar")
      ? "ar"
      : "en";

    const data = await fetchAiAnalytics(supabase, period.from, period.to, locale);

    return NextResponse.json({
      data: {
        ...data,
        meta: { preset: period.preset },
      },
    });
  } catch (error) {
    console.error("AI analytics error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load analytics",
        },
      },
      { status: 500 }
    );
  }
}
