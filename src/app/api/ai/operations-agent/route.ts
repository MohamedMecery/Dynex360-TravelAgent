import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { buildOperationsAgentSystemPrompt } from "@/lib/operations-ai/operations-agent-prompt";
import { resolveAiLocale } from "@/lib/ai/locale";
import { generateKnowledgeAnswer } from "@/lib/ai/claude-client";
import {
  ensureAiConversation,
  ensureAiSession,
  logAiEvent,
  persistAiMessage,
} from "@/lib/ai/conversation";
import {
  buildOperationsAgentContext,
  formatOperationsContextForPrompt,
} from "@/lib/operations-ai/operations-agent-tools";
import {
  checkOperationsAgentRateLimit,
  checkOperationsAgentTokenBudget,
  estimateTokens,
} from "@/lib/operations-ai/rate-limit";
import { operationsAgentRequestSchema } from "@/lib/validation/operations-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) return gate;

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;

    if (!hasAiPermission(access.role, "ai.operations.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.operations.use permission" } },
        { status: 403 }
      );
    }

    if (!checkOperationsAgentRateLimit(user.id)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Too many operations agent requests" } },
        { status: 429 }
      );
    }

    const parsed = operationsAgentRequestSchema.safeParse(await request.json());
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

    const {
      message,
      conversation_id,
      session_id,
      locale: requestLocale,
      booking_id,
    } = parsed.data;

    const locale = resolveAiLocale(requestLocale, message);
    const startedAt = Date.now();

    const agentContext = await buildOperationsAgentContext(supabase, {
      bookingId: booking_id,
    });

    const contextBlock = formatOperationsContextForPrompt(agentContext);
    const tokenEstimate = estimateTokens(contextBlock + message);
    const budget = await checkOperationsAgentTokenBudget(
      createAdminClient(),
      tenantId,
      tokenEstimate
    );

    if (!budget.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "TOKEN_BUDGET_EXCEEDED",
            message: "Monthly operations agent token budget exceeded",
            budget: budget.budget,
            used: budget.used,
          },
        },
        { status: 429 }
      );
    }

    const sessionId = await ensureAiSession(supabase, tenantId, user.id, session_id);
    const conversationId = await ensureAiConversation(
      supabase,
      tenantId,
      user.id,
      "operations",
      message,
      sessionId,
      conversation_id
    );

    await persistAiMessage(supabase, {
      conversationId,
      tenantId,
      role: "user",
      content: message,
    });

    const result = await generateKnowledgeAnswer({
      systemPrompt: buildOperationsAgentSystemPrompt(locale),
      question: message,
      context: contextBlock,
    });

    await persistAiMessage(supabase, {
      conversationId,
      tenantId,
      role: "assistant",
      content: result.answer,
      metadata: {
        citations: agentContext.citations,
        used_llm: result.usedLlm,
        model: result.model,
      },
    });

    await logAiEvent(supabase, {
      tenantId,
      conversationId,
      userId: user.id,
      eventType: "operations_agent_completion",
      payload: {
        tokens: tokenEstimate,
        latency_ms: Date.now() - startedAt,
        booking_id,
        citation_count: agentContext.citations.length,
      },
    });

    return NextResponse.json({
      data: {
        answer: result.answer,
        conversation_id: conversationId,
        session_id: sessionId,
        citations: agentContext.citations,
        snapshot: agentContext.snapshot,
        recommendations: agentContext.recommendations,
        model: result.model,
        used_llm: result.usedLlm,
      },
    });
  } catch (error) {
    console.error("Operations agent error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Operations agent failed",
        },
      },
      { status: 500 }
    );
  }
}
