import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import {
  completeOpsRecommendation,
  dismissOpsRecommendation,
} from "@/lib/operations-ai/recommendation-service";
import { opsRecommendationDismissSchema } from "@/lib/validation/operations-ai";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.operations.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.operations.read permission" } },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "dismiss") {
    const parsed = opsRecommendationDismissSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
        { status: 400 }
      );
    }
    try {
      await dismissOpsRecommendation(
        gate.supabase,
        id,
        gate.user.id,
        parsed.data.reason
      );
      return NextResponse.json({ data: { status: "dismissed" } });
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Failed",
          },
        },
        { status: 500 }
      );
    }
  }

  if (action === "complete") {
    try {
      await completeOpsRecommendation(gate.supabase, id, gate.user.id);
      return NextResponse.json({ data: { status: "completed" } });
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Failed",
          },
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "action must be dismiss or complete" } },
    { status: 400 }
  );
}
