import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import {
  exportFeedbackCsv,
  exportSupportCsv,
  exportUsageCsv,
} from "@/lib/ai/analytics/export-csv";
import { resolveAnalyticsPeriod } from "@/lib/ai/analytics/period";
import { analyticsExportQuerySchema } from "@/lib/ai/analytics/validation";

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
    const parsed = analyticsExportQuerySchema.safeParse(params);
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

    const { type } = parsed.data;
    const csv =
      type === "feedback"
        ? await exportFeedbackCsv(supabase, period.from, period.to)
        : type === "usage"
          ? await exportUsageCsv(supabase, period.from, period.to)
          : await exportSupportCsv(supabase, period.from, period.to);

    const filename = `travelos-ai-${type}-${period.from.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("AI analytics export error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to export analytics",
        },
      },
      { status: 500 }
    );
  }
}
