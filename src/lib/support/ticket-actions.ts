import { SupabaseClient } from "@supabase/supabase-js";
import {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@/types";
import { UpdateSupportTicketInput } from "@/lib/validation/support-ticket";

type UserRoleJoinRow = {
  user_id: string;
  roles: { name: string } | { name: string }[] | null;
};

function roleFromJoin(row: UserRoleJoinRow | undefined): UserRole | null {
  if (!row?.roles) return null;
  const roles = row.roles;
  const name = Array.isArray(roles) ? roles[0]?.name : roles.name;
  return (name as UserRole) ?? null;
}

export async function findDefaultTicketAssignee(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id, user_roles(roles(name))")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(25);

  if (!data?.length) return null;

  const admin = data.find((row) => {
    const joins = row.user_roles as UserRoleJoinRow[] | undefined;
    return roleFromJoin(joins?.[0]) === "tenant_admin";
  });

  return (admin?.id as string | undefined) ?? (data[0]?.id as string | undefined) ?? null;
}

export async function updateSupportTicket(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  ticketId: string,
  input: UpdateSupportTicketInput
): Promise<SupportTicket> {
  const { data: existing, error: loadError } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) {
    throw new Error(loadError.message);
  }

  if (!existing) {
    throw new Error("Ticket not found");
  }

  const patch: {
    status?: SupportTicketStatus;
    assigned_user_id?: string | null;
    priority?: SupportTicketPriority;
    updated_by: string;
  } = { updated_by: userId };

  if (input.priority) {
    patch.priority = input.priority;
  }

  if (input.assigned_user_id !== undefined) {
    patch.assigned_user_id = input.assigned_user_id;
  }

  if (input.escalate) {
    patch.status = "escalated";
    patch.priority = input.priority ?? "high";
    if (patch.assigned_user_id === undefined && !existing.assigned_user_id) {
      patch.assigned_user_id = await findDefaultTicketAssignee(supabase, tenantId);
    }
  } else if (input.status) {
    patch.status = input.status;
  }

  const { data: updated, error: updateError } = await supabase
    .from("support_tickets")
    .update(patch)
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Failed to update ticket");
  }

  const statusChanged = patch.status && patch.status !== existing.status;
  const assigneeChanged =
    patch.assigned_user_id !== undefined &&
    patch.assigned_user_id !== existing.assigned_user_id;

  if (statusChanged || assigneeChanged) {
    const noteParts: string[] = [];
    if (statusChanged) {
      noteParts.push(`Status changed to ${patch.status}.`);
    }
    if (assigneeChanged && patch.assigned_user_id) {
      noteParts.push("Ticket assigned for follow-up.");
    }

    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      tenant_id: tenantId,
      author_type: "system",
      author_user_id: userId,
      content: noteParts.join(" "),
      metadata: { source: "ticket_actions", status: patch.status, assigned_user_id: patch.assigned_user_id },
    });
  }

  return updated as SupportTicket;
}
