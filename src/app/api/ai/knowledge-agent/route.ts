import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { generateKnowledgeAnswer } from "@/lib/ai/claude-client";
import { buildKnowledgeSystemPrompt } from "@/lib/ai/agent-prompts";
import { resolveAiLocale } from "@/lib/ai/locale";
import {
  buildContextFromChunks,
  chunksToCitations,
  retrieveKnowledgeChunks,
} from "@/lib/ai/knowledge-retrieval";
import { knowledgeAgentRequestSchema } from "@/lib/validation/knowledge-agent";
import { AiMessageRole, KnowledgeAgentResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    const { role } = access;

    if (!hasAiPermission(role, "ai.knowledge.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.knowledge.use permission" } },
        { status: 403 }
      );
    }

    const rawBody: unknown = await request.json();
    const parsed = knowledgeAgentRequestSchema.safeParse(rawBody);
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

    const { message, conversation_id, session_id, document_type, locale: requestLocale } =
      parsed.data;
    const locale = resolveAiLocale(requestLocale, message);
    const startedAt = Date.now();

    let conversationId = conversation_id;
    let sessionId = session_id;

    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("ai_sessions")
        .insert({ tenant_id: tenantId, user_id: user.id })
        .select("id")
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: { code: "SESSION_ERROR", message: sessionError?.message ?? "Failed to create session" } },
          { status: 500 }
        );
      }
      sessionId = session.id;
    }

    if (!conversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from("ai_conversations")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          session_id: sessionId,
          agent_key: "knowledge",
          title: message.slice(0, 80),
        })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        return NextResponse.json(
          {
            error: {
              code: "CONVERSATION_ERROR",
              message: conversationError?.message ?? "Failed to create conversation",
            },
          },
          { status: 500 }
        );
      }
      conversationId = conversation.id;
    }

    if (!sessionId || !conversationId) {
      return NextResponse.json(
        { error: { code: "SESSION_ERROR", message: "Failed to establish AI session" } },
        { status: 500 }
      );
    }

    const { error: userMessageError } = await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      role: "user" satisfies AiMessageRole,
      content: message,
    });

    if (userMessageError) {
      return NextResponse.json(
        { error: { code: "MESSAGE_ERROR", message: userMessageError.message } },
        { status: 500 }
      );
    }

    const chunks = await retrieveKnowledgeChunks(supabase, message, {
      matchCount: 6,
      documentType: document_type,
      locale,
    });

    const citations = chunksToCitations(chunks);
    const context = buildContextFromChunks(chunks);

    const { data: priorMessages } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const history =
      priorMessages
        ?.filter((m) => m.role === "user" || m.role === "assistant")
        .slice(0, -1)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })) ?? [];

    const { answer, model, usedLlm } = await generateKnowledgeAnswer({
      systemPrompt: buildKnowledgeSystemPrompt(locale),
      question: message,
      context,
      history,
    });

    const confidence =
      chunks.length === 0 ? "low" : chunks[0].score >= 0.7 ? "high" : "medium";

    const { data: assistantMessage, error: assistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        tenant_id: tenantId,
        role: "assistant" satisfies AiMessageRole,
        content: answer,
        metadata: { citations, confidence, model, used_llm: usedLlm },
      })
      .select("id")
      .single();

    if (assistantError) {
      return NextResponse.json(
        { error: { code: "MESSAGE_ERROR", message: assistantError.message } },
        { status: 500 }
      );
    }

    await supabase.from("ai_logs").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      user_id: user.id,
      event_type: "knowledge_retrieval",
      payload: {
        chunk_count: chunks.length,
        chunk_ids: chunks.map((c) => c.id),
        latency_ms: Date.now() - startedAt,
        model,
        used_llm: usedLlm,
      },
    });

    const response: KnowledgeAgentResponse = {
      reply: answer,
      citations,
      confidence,
      conversation_id: conversationId,
      session_id: sessionId,
      message_id: assistantMessage?.id,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Knowledge agent error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Agent processing failed" } },
      { status: 500 }
    );
  }
}
