import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { buildSupportSystemPrompt } from "@/lib/ai/agent-prompts";
import { resolveAiLocale } from "@/lib/ai/locale";
import { generateKnowledgeAnswer } from "@/lib/ai/claude-client";
import {
  ensureAiConversation,
  ensureAiSession,
  logAiEvent,
  persistAiMessage,
} from "@/lib/ai/conversation";
import {
  buildContextFromChunks,
  chunksToCitations,
  retrieveKnowledgeChunks,
} from "@/lib/ai/knowledge-retrieval";
import {
  createSupportTicket,
  detectEscalation,
  detectTicketIntent,
  extractBookingReference,
  formatBookingSummary,
  lookupBookingByReference,
} from "@/lib/ai/support-tools";
import { supportAgentRequestSchema } from "@/lib/validation/support-agent";
import { SupportAgentResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    const { role } = access;

    if (!hasAiPermission(role, "ai.support.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.support.use permission" } },
        { status: 403 }
      );
    }

    const parsed = supportAgentRequestSchema.safeParse(await request.json());
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
      customer_id,
      booking_id,
      create_ticket,
    } = parsed.data;
    const locale = resolveAiLocale(requestLocale, message);
    const startedAt = Date.now();

    const sessionId = await ensureAiSession(supabase, tenantId, user.id, session_id);
    const conversationId = await ensureAiConversation(
      supabase,
      tenantId,
      user.id,
      "support",
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

    const chunks = await retrieveKnowledgeChunks(supabase, message, {
      matchCount: 5,
      locale,
    });
    const citations = chunksToCitations(chunks);
    let context = buildContextFromChunks(chunks);

    let bookingSummary: string | undefined;
    let resolvedBookingId = booking_id;

    const reference = extractBookingReference(message);
    if (reference) {
      const booking = await lookupBookingByReference(supabase, reference);
      if (booking) {
        bookingSummary = formatBookingSummary(booking);
        context += `\n\nLive booking data:\n${bookingSummary}`;
        resolvedBookingId = booking.id;
      }
    } else if (booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, reference_number, status, payment_status, total_amount, currency")
        .eq("id", booking_id)
        .maybeSingle();

      if (booking) {
        bookingSummary = formatBookingSummary(booking as Parameters<typeof formatBookingSummary>[0]);
        context += `\n\nLive booking data:\n${bookingSummary}`;
      }
    }

    const shouldCreateTicket =
      create_ticket ||
      detectTicketIntent(message) ||
      (detectEscalation(message) && chunks.length === 0);

    let ticket = null;
    if (shouldCreateTicket) {
      ticket = await createSupportTicket(supabase, {
        tenantId,
        userId: user.id,
        subject: message.slice(0, 255),
        customerId: customer_id,
        bookingId: resolvedBookingId,
        initialMessage: message,
      });
      context += `\n\nSupport ticket created: ${ticket.ticket_number} (${ticket.status}, priority ${ticket.priority})`;
    }

    const { answer, model, usedLlm } = await generateKnowledgeAnswer({
      systemPrompt: buildSupportSystemPrompt(locale),
      question: message,
      context,
    });

    const confidence =
      chunks.length === 0 && !bookingSummary
        ? "low"
        : chunks[0]?.score >= 0.7 || bookingSummary
          ? "high"
          : "medium";

    const messageId = await persistAiMessage(supabase, {
      conversationId,
      tenantId,
      role: "assistant",
      content: answer,
      metadata: { citations, confidence, model, used_llm: usedLlm, ticket_id: ticket?.id },
    });

    await logAiEvent(supabase, {
      tenantId,
      conversationId,
      userId: user.id,
      eventType: "support_agent",
      payload: {
        chunk_count: chunks.length,
        ticket_id: ticket?.id,
        booking_id: resolvedBookingId,
        latency_ms: Date.now() - startedAt,
        model,
      },
    });

    const response: SupportAgentResponse = {
      reply: answer,
      citations,
      confidence,
      conversation_id: conversationId,
      session_id: sessionId,
      message_id: messageId,
      ticket: ticket ?? undefined,
      booking_summary: bookingSummary,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Support agent error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Agent processing failed" } },
      { status: 500 }
    );
  }
}
