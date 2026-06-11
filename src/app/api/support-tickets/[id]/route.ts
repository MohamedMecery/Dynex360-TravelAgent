import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { sendSupportTicketNotificationEmail } from "@/lib/email/notifications/support-ticket";
import { updateSupportTicket } from "@/lib/support/ticket-actions";
import { updateSupportTicketSchema } from "@/lib/validation/support-ticket";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const { role } = access;

    if (!hasAiPermission(role, "ai.support.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.support.use permission" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const parsed = updateSupportTicketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { data: before } = await supabase
      .from("support_tickets")
      .select("status, assigned_user_id")
      .eq("id", id)
      .eq("tenant_id", access.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    const ticket = await updateSupportTicket(
      supabase,
      access.tenantId,
      user.id,
      id,
      parsed.data
    );

    const assigneeTarget = ticket.assigned_user_id ?? null;
    const assigneeChanged =
      before?.assigned_user_id !== ticket.assigned_user_id && Boolean(assigneeTarget);
    const statusChanged = before?.status !== ticket.status;

    if (assigneeChanged && assigneeTarget) {
      void sendSupportTicketNotificationEmail(supabase, {
        tenantId: access.tenantId,
        ticket,
        assigneeUserId: assigneeTarget,
        event: "assigned",
      });
    } else if (statusChanged && assigneeTarget) {
      void sendSupportTicketNotificationEmail(supabase, {
        tenantId: access.tenantId,
        ticket,
        assigneeUserId: assigneeTarget,
        event: "status_updated",
      });
    }

    return NextResponse.json({ data: ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ticket";
    const status = message === "Ticket not found" ? 404 : 500;
    return NextResponse.json({ error: { code: "TICKET_ERROR", message } }, { status });
  }
}
