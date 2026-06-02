import { NextResponse } from "next/server";
import { hasDashboardPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchDashboardStats } from "@/lib/dashboard/stats";

export async function GET(): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, access } = gate;
    const role = access.role;

    if (!hasDashboardPermission(role, "dashboard.read")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing dashboard.read permission" } },
        { status: 403 }
      );
    }

    const includeFinancial = hasDashboardPermission(role, "dashboard.financial");
    const stats = await fetchDashboardStats(supabase, { includeFinancial });

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load dashboard stats",
        },
      },
      { status: 500 }
    );
  }
}
