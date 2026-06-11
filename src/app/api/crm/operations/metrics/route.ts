import { NextResponse } from "next/server";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { canReadOperationsDashboard } from "@/lib/auth/crm-rbac";
import { fetchOperationsMetrics } from "@/lib/crm/operations-metrics-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!canReadOperationsDashboard(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Operations dashboard requires tenant admin" } },
      { status: 403 }
    );
  }

  try {
    const admin = createAdminClient();
    const tenantScope =
      gate.access.role === "super_admin" ? null : gate.access.tenantId;
    const metrics = await fetchOperationsMetrics(admin, tenantScope);
    return NextResponse.json({ data: metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load operations metrics";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
