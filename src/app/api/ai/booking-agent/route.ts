import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import {
  applyPendingAction,
  runBookingAgent,
} from "@/lib/ai/booking-agent";
import { bookingAgentMessages } from "@/lib/ai/booking-agent-messages";
import { resolveAiLocale } from "@/lib/ai/locale";
import {
  ensureAiConversation,
  ensureAiSession,
  logAiEvent,
  persistAiMessage,
} from "@/lib/ai/conversation";
import { bookingAgentRequestSchema } from "@/lib/validation/booking-agent";
import { BookingAgentResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    const { role } = access;

    if (!hasAiPermission(role, "ai.booking.use")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.booking.use permission" } },
        { status: 403 }
      );
    }

    const parsed = bookingAgentRequestSchema.safeParse(await request.json());
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
      confirm_action,
      apply_action,
      filters,
    } = parsed.data;

    const locale = resolveAiLocale(requestLocale, message ?? undefined);

    const startedAt = Date.now();
    const logMessage =
      message ??
      (apply_action ? `apply:${apply_action.type}` : `confirm:${confirm_action?.type}`);

    const sessionId = await ensureAiSession(supabase, tenantId, user.id, session_id);
    const conversationId = await ensureAiConversation(
      supabase,
      tenantId,
      user.id,
      "booking",
      logMessage,
      sessionId,
      conversation_id
    );

    if (message) {
      await persistAiMessage(supabase, {
        conversationId,
        tenantId,
        role: "user",
        content: message,
      });
    }

    let agentResult: Omit<BookingAgentResponse, "conversation_id" | "session_id" | "message_id">;

    if (apply_action) {
      const draft = await applyPendingAction(supabase, tenantId, user.id, apply_action);
      agentResult = {
        reply:
          apply_action.type === "create_draft"
            ? bookingAgentMessages.applyDraftCreated(locale, draft.reference_number)
            : apply_action.type === "update_draft"
              ? bookingAgentMessages.applyDraftUpdated(locale, draft.reference_number)
              : bookingAgentMessages.applyCancelRecorded(locale, draft.reference_number),
        intent:
          apply_action.type === "propose_cancellation" ? "propose_cancellation" : apply_action.type,
        draft,
        requires_confirmation: false,
      };

      await logAiEvent(supabase, {
        tenantId,
        conversationId,
        userId: user.id,
        eventType: "booking_action_confirmed",
        payload: { action_type: apply_action.type, draft, latency_ms: Date.now() - startedAt },
      });
    } else if (confirm_action) {
      agentResult = await runBookingAgent(supabase, tenantId, user.id, {
        message: logMessage,
        locale,
        confirmAction: confirm_action,
      });

      await logAiEvent(supabase, {
        tenantId,
        conversationId,
        userId: user.id,
        eventType: "booking_tool_call",
        payload: {
          tool: confirm_action.type,
          phase: "preview",
          latency_ms: Date.now() - startedAt,
        },
      });
    } else {
      agentResult = await runBookingAgent(supabase, tenantId, user.id, {
        message: message!,
        locale,
        filters,
      });

      await logAiEvent(supabase, {
        tenantId,
        conversationId,
        userId: user.id,
        eventType: "booking_tool_call",
        payload: {
          intent: agentResult.intent,
          latency_ms: Date.now() - startedAt,
        },
      });
    }

    const messageId = await persistAiMessage(supabase, {
      conversationId,
      tenantId,
      role: "assistant",
      content: agentResult.reply,
      metadata: {
        intent: agentResult.intent,
        pending_action: agentResult.pending_action,
        draft: agentResult.draft,
      },
    });

    const response: BookingAgentResponse = {
      ...agentResult,
      conversation_id: conversationId,
      session_id: sessionId,
      message_id: messageId,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Booking agent error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Agent processing failed",
        },
      },
      { status: 500 }
    );
  }
}
