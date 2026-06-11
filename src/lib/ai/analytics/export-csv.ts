import { SupabaseClient } from "@supabase/supabase-js";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\n");
}

export async function exportFeedbackCsv(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<string> {
  const { data: feedbackRows, error } = await supabase
    .from("ai_feedback")
    .select("id, rating, comment, created_at, message_id, user_id")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const messageIds = [...new Set((feedbackRows ?? []).map((row) => row.message_id))];
  const agentByMessage = new Map<string, string>();

  if (messageIds.length > 0) {
    const { data: messages, error: messagesError } = await supabase
      .from("ai_messages")
      .select("id, conversation_id")
      .in("id", messageIds);

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    const conversationIds = [
      ...new Set((messages ?? []).map((m) => m.conversation_id).filter(Boolean)),
    ];

    const conversationAgent = new Map<string, string>();
    if (conversationIds.length > 0) {
      const { data: conversations, error: convError } = await supabase
        .from("ai_conversations")
        .select("id, agent_key")
        .in("id", conversationIds);

      if (convError) {
        throw new Error(convError.message);
      }

      for (const conv of conversations ?? []) {
        conversationAgent.set(conv.id, conv.agent_key);
      }
    }

    for (const message of messages ?? []) {
      const agent = conversationAgent.get(message.conversation_id) ?? "";
      agentByMessage.set(message.id, agent);
    }
  }

  const rows = (feedbackRows ?? []).map((row) => [
    row.id,
    row.created_at,
    row.rating,
    agentByMessage.get(row.message_id) ?? "",
    row.message_id,
    row.user_id,
    row.comment ?? "",
  ]);

  return rowsToCsv(
    ["feedback_id", "created_at", "rating", "agent_key", "message_id", "user_id", "comment"],
    rows
  );
}

export async function exportUsageCsv(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<string> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, agent_key, user_id, title, created_at, updated_at")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => [
    row.id,
    row.created_at,
    row.updated_at,
    row.agent_key,
    row.user_id,
    row.title ?? "",
  ]);

  return rowsToCsv(
    ["conversation_id", "created_at", "updated_at", "agent_key", "user_id", "title"],
    rows
  );
}

export async function exportSupportCsv(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<string> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, status, priority, subject, customer_id, booking_id, assigned_user_id, created_at, updated_at"
    )
    .is("deleted_at", null)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => [
    row.id,
    row.ticket_number,
    row.status,
    row.priority,
    row.subject,
    row.customer_id ?? "",
    row.booking_id ?? "",
    row.assigned_user_id ?? "",
    row.created_at,
    row.updated_at,
  ]);

  return rowsToCsv(
    [
      "ticket_id",
      "ticket_number",
      "status",
      "priority",
      "subject",
      "customer_id",
      "booking_id",
      "assigned_user_id",
      "created_at",
      "updated_at",
    ],
    rows
  );
}
