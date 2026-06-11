import { NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import {
  requireActiveApiAccess,
  type ActiveApiContext,
} from "@/lib/auth/require-active-api-access";

export async function requireCrmApiAccess(
  permission: string
): Promise<ActiveApiContext | NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasCrmPermission(gate.access.role, permission)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: `Missing permission: ${permission}`,
        },
      },
      { status: 403 }
    );
  }

  return gate;
}

interface DuplicateLeadError extends Error {
  code?: string;
  duplicates?: unknown[];
}

export function crmApiErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Internal error";
  const dup = error as DuplicateLeadError;
  if (
    (dup.code === "EXACT_DUPLICATE_LEAD" || dup.code === "DUPLICATE_LEAD") &&
    dup.duplicates
  ) {
    return NextResponse.json(
      {
        error: {
          code: "EXACT_DUPLICATE_LEAD",
          message: "An exact duplicate lead already exists",
          details: dup.duplicates,
        },
      },
      { status: 409 }
    );
  }
  if (message.includes("Direction is required") || message.includes("Direction applies")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
  if (message.includes("not found") || message.includes("Not found")) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message } },
      { status: 404 }
    );
  }
  if (message.includes("Forbidden") || message.includes("permission")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message } },
      { status: 403 }
    );
  }
  if (
    (error as { code?: string }).code === "BOOKING_STAGE_NOT_ALLOWED" ||
    message.includes("Create booking requires stage")
  ) {
    return NextResponse.json(
      { error: { code: "BOOKING_STAGE_NOT_ALLOWED", message } },
      { status: 422 }
    );
  }
  const code = (error as { code?: string }).code;
  if (
    code === "QUOTATION_TRANSITION_INVALID" ||
    code === "QUOTATION_NOT_EDITABLE" ||
    code === "QUOTATION_EXPIRED" ||
    code === "CUSTOMER_REQUIRED" ||
    code === "ITEMS_REQUIRED" ||
    code === "QUOTATION_NOT_ACCEPTED" ||
    code === "OPPORTUNITY_CLOSED" ||
    code === "APPROVAL_MODE_SIMPLE"
  ) {
    return NextResponse.json(
      { error: { code: code ?? "UNPROCESSABLE", message } },
      { status: 422 }
    );
  }
  if (code === "ACTIVE_QUOTATION_EXISTS" || code === "ALREADY_CONVERTED") {
    return NextResponse.json(
      { error: { code, message } },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 }
  );
}
