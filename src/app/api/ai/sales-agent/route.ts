import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { buildSalesAgentSystemPrompt } from "@/lib/sales-ai/sales-agent-prompt";
import { resolveAiLocale } from "@/lib/ai/locale";
import { generateKnowledgeAnswer } from "@/lib/ai/claude-client";
import {
  ensureAiConversation,
  ensureAiSession,
  logAiEvent,
  persistAiMessage,
} from "@/lib/ai/conversation";
import {
  buildSalesAgentContext,
  formatSalesContextForPrompt,
} from "@/lib/sales-ai/sales-agent-tools";
import {
  checkSalesAgentRateLimit,
  checkSalesAgentTokenBudget,
  estimateTokens,
} from "@/lib/sales-ai/rate-limit";
import { salesAgentRequestSchema } from "@/lib/validation/sales-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) return gate;

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;

    if (!hasAiPermission(access.role, "ai.sales.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.sales.use permission" } },
        { status: 403 }
      );
    }

    if (!checkSalesAgentRateLimit(user.id)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Too many sales agent requests" } },
        { status: 429 }
      );
    }

    const parsed = salesAgentRequestSchema.safeParse(await request.json());
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
      entity_type,
      entity_id,
      customer_id,
      opportunity_id,
    } = parsed.data;

    const locale = resolveAiLocale(requestLocale, message);
    const startedAt = Date.now();

    const agentContext = await buildSalesAgentContext(supabase, {
      entityType: entity_type,
      entityId: entity_id,
      customerId: customer_id,
      opportunityId: opportunity_id,
    });

    const contextBlock = formatSalesContextForPrompt(agentContext);
    const tokenEstimate = estimateTokens(contextBlock + message);
    const budget = await checkSalesAgentTokenBudget(createAdminClient(), tenantId, tokenEstimate);

    if (!budget.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "TOKEN_BUDGET_EXCEEDED",
            message: "Monthly sales agent token budget exceeded",
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
      "sales",
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
      systemPrompt: buildSalesAgentSystemPrompt(locale),
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
      eventType: "sales_agent_completion",
      payload: {
        tokens: tokenEstimate,
        latency_ms: Date.now() - startedAt,
        entity_type,
        entity_id,
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
    console.error("Sales agent error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Sales agent failed",
        },
      },
      { status: 500 }
    );
  }
}
