import { SupabaseClient } from "@supabase/supabase-js";
import { AiAgentKey, AiMessageRole } from "@/types";

export interface AiConversationContext {
  sessionId: string;
  conversationId: string;
}

export async function ensureAiSession(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  sessionId?: string
): Promise<string> {
  if (sessionId) return sessionId;

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({ tenant_id: tenantId, user_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create AI session");
  }

  return data.id;
}

export async function ensureAiConversation(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  agentKey: AiAgentKey,
  message: string,
  sessionId: string,
  conversationId?: string
): Promise<string> {
  if (conversationId) return conversationId;

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      session_id: sessionId,
      agent_key: agentKey,
      title: message.slice(0, 80),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create AI conversation");
  }

  return data.id;
}

export async function persistAiMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    tenantId: string;
    role: AiMessageRole;
    content: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      tenant_id: input.tenantId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id;
}

export async function logAiEvent(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    conversationId: string;
    userId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("ai_logs").insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    user_id: input.userId,
    event_type: input.eventType,
    payload: input.payload,
  });
}
