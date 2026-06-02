import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { aiFeedbackRequestSchema } from "@/lib/validation/ai-feedback";
import { AiFeedbackRating } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const tenantId = access.tenantId;
    const { role } = access;

    if (!hasAiPermission(role, "ai.read")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing ai.read permission" } },
        { status: 403 }
      );
    }

    const parsed = aiFeedbackRequestSchema.safeParse(await request.json());
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

    const { message_id, rating, comment } = parsed.data;

    const { data: message, error: messageError } = await supabase
      .from("ai_messages")
      .select("id, tenant_id, role, conversation_id")
      .eq("id", message_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (messageError) {
      return NextResponse.json(
        { error: { code: "MESSAGE_ERROR", message: messageError.message } },
        { status: 500 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Message not found" } },
        { status: 404 }
      );
    }

    if (message.role !== "assistant") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Feedback applies to assistant messages only" } },
        { status: 400 }
      );
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("ai_feedback")
      .upsert(
        {
          tenant_id: tenantId,
          message_id,
          user_id: user.id,
          rating: rating satisfies AiFeedbackRating,
          comment: comment ?? null,
        },
        { onConflict: "user_id,message_id" }
      )
      .select("id, rating, created_at")
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: { code: "FEEDBACK_ERROR", message: feedbackError?.message ?? "Failed to save feedback" } },
        { status: 500 }
      );
    }

    await supabase.from("ai_logs").insert({
      tenant_id: tenantId,
      conversation_id: message.conversation_id,
      user_id: user.id,
      event_type: "ai_feedback",
      payload: { message_id, rating, has_comment: Boolean(comment) },
    });

    return NextResponse.json({ data: feedback });
  } catch (error) {
    console.error("AI feedback error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save feedback" } },
      { status: 500 }
    );
  }
}
