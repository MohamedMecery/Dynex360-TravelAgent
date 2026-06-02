/**
 * Booking Agent orchestrator — tool-based, human-in-the-loop.
 *
 * Database impact (MVP recommendation — no new migration):
 * - Use existing `ai_logs` (event_type: booking_tool_call | booking_action_confirmed)
 * - Use `ai_messages.metadata` for pending_action payloads
 * - Reuse `bookings`, `booking_items`, `booking_travelers`, `booking_notes`
 *
 * POST-MVP only if needed:
 * - `booking_agent_actions` — queued mutations with approval workflow
 * - `booking_agent_logs` — duplicate of ai_logs unless analytics require separation
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  parseBookingIntent,
  extractBookingReference,
  extractTravelDate,
  extractPriceRange,
  extractDestinationHint,
} from "@/lib/ai/booking-intent";
import {
  bookingAgentMessages,
  buildSearchResponse as formatSearchReply,
  buildLookupResponse as formatLookupReply,
  buildCustomerResponse as formatCustomerReply,
  cancellationRulesText,
  formatDraftPreviewReply,
} from "@/lib/ai/booking-agent-messages";
import { AiLocale, resolveAiLocale } from "@/lib/ai/locale";
import {
  searchPackages,
  searchCustomers,
  lookupBooking,
  buildDraftPreview,
  executeCreateDraft,
  executeUpdateDraft,
  executeProposeCancellation,
  BookingDetailResult,
  DraftPreview,
} from "@/lib/ai/booking-tools";
import { BookingAgentAction } from "@/lib/validation/booking-agent";
import {
  BookingAgentPendingAction,
  BookingAgentResponse,
  BookingDraftResult,
} from "@/types";

export interface RunBookingAgentInput {
  message: string;
  locale?: AiLocale;
  filters?: {
    destination?: string;
    min_price?: number;
    max_price?: number;
    travel_date?: string;
  };
  confirmAction?: BookingAgentAction;
}

export async function runBookingAgent(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  input: RunBookingAgentInput
): Promise<Omit<BookingAgentResponse, "conversation_id" | "session_id" | "message_id">> {
  if (input.confirmAction) {
    return executeConfirmedAction(supabase, tenantId, userId, input.confirmAction, input.locale);
  }

  const locale = resolveAiLocale(input.locale, input.message);
  const intent = parseBookingIntent(input.message);
  const extractedDate = extractTravelDate(input.message);
  const priceRange = extractPriceRange(input.message);
  const destinationHint = extractDestinationHint(input.message);

  const filters = {
    destination: input.filters?.destination ?? destinationHint ?? undefined,
    minPrice: input.filters?.min_price ?? priceRange.min,
    maxPrice: input.filters?.max_price ?? priceRange.max,
    travelDate: input.filters?.travel_date ?? extractedDate ?? undefined,
  };

  switch (intent) {
    case "search_packages": {
      const packages = await searchPackages(supabase, filters);
      return {
        reply: formatSearchReply(locale, packages, filters),
        intent: "search_packages",
        recommendations: packages,
        requires_confirmation: false,
      };
    }
    case "lookup_booking": {
      const ref = extractBookingReference(input.message);
      if (!ref) {
        return {
          reply: bookingAgentMessages.lookupRefRequired(locale),
          intent,
          requires_confirmation: false,
        };
      }
      const booking = await lookupBooking(supabase, ref);
      if (!booking) {
        return {
          reply: bookingAgentMessages.bookingNotFound(locale, ref),
          intent,
          requires_confirmation: false,
        };
      }
      return {
        reply: formatLookupReply(locale, booking),
        intent: "lookup_booking",
        booking,
        requires_confirmation: false,
      };
    }
    case "search_customers": {
      const customers = await searchCustomers(supabase, input.message);
      return {
        reply: formatCustomerReply(locale, customers),
        intent: "search_customers",
        customers,
        requires_confirmation: false,
      };
    }
    case "create_draft":
      return {
        reply: bookingAgentMessages.createDraftHelp(locale),
        intent,
        requires_confirmation: false,
        clarifying_questions: bookingAgentMessages.createDraftQuestions(locale),
      };
    case "update_draft":
      return {
        reply: bookingAgentMessages.updateDraftHelp(locale),
        intent,
        requires_confirmation: false,
      };
    case "propose_cancellation": {
      const ref = extractBookingReference(input.message);
      if (!ref) {
        return {
          reply: bookingAgentMessages.cancelRefRequired(locale),
          intent,
          requires_confirmation: false,
        };
      }
      const booking = await lookupBooking(supabase, ref);
      if (!booking) {
        return {
          reply: bookingAgentMessages.bookingNotFound(locale, ref),
          intent,
          requires_confirmation: false,
        };
      }
      const rules = cancellationRulesText(locale, booking.status, booking.payment_status);
      const pending: BookingAgentPendingAction = {
        type: "propose_cancellation",
        booking_id: booking.id,
        reason: input.message.slice(0, 500),
        reference_number: booking.reference_number,
      };
      return {
        reply: bookingAgentMessages.cancelReview(
          locale,
          booking.reference_number,
          booking.status,
          booking.payment_status,
          rules
        ),
        intent,
        booking,
        cancellation_rules: rules,
        pending_action: pending,
        requires_confirmation: true,
      };
    }
    default:
      return handleGeneralIntent(supabase, input.message, filters, locale);
  }
}

async function executeConfirmedAction(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  action: BookingAgentAction,
  uiLocale?: AiLocale
): Promise<Omit<BookingAgentResponse, "conversation_id" | "session_id" | "message_id">> {
  const locale = resolveAiLocale(uiLocale);
  switch (action.type) {
    case "create_draft": {
      const preview = await buildDraftPreview(supabase, action);
      const pending: BookingAgentPendingAction = {
        type: "create_draft",
        preview,
      };
      return {
        reply: formatDraftPreviewReply(locale, preview, true),
        intent: "create_draft",
        draft_preview: preview,
        pending_action: pending,
        requires_confirmation: true,
      };
    }
    case "update_draft": {
      const booking = await lookupBookingById(supabase, action.booking_id);
      if (!booking) {
        return {
          reply: bookingAgentMessages.bookingNotFoundGeneric(locale),
          intent: "update_draft",
          requires_confirmation: false,
        };
      }
      if (booking.status !== "draft") {
        return {
          reply: bookingAgentMessages.onlyDraftUpdatable(locale),
          intent: "update_draft",
          requires_confirmation: false,
        };
      }
      const pending: BookingAgentPendingAction = {
        type: "update_draft",
        booking_id: action.booking_id,
        travel_date: action.travel_date,
        package_id: action.package_id,
        travelers: action.travelers,
        notes: action.notes,
        reference_number: booking.reference_number,
      };
      return {
        reply: bookingAgentMessages.reviewDraftUpdate(locale, booking.reference_number),
        intent: "update_draft",
        booking,
        pending_action: pending,
        requires_confirmation: true,
      };
    }
    case "propose_cancellation": {
      const booking = await lookupBookingById(supabase, action.booking_id);
      if (!booking) {
        return {
          reply: bookingAgentMessages.bookingNotFoundGeneric(locale),
          intent: "propose_cancellation",
          requires_confirmation: false,
        };
      }
      const rules = cancellationRulesText(locale, booking.status, booking.payment_status);
      const pending: BookingAgentPendingAction = {
        type: "propose_cancellation",
        booking_id: action.booking_id,
        reason: action.reason,
        reference_number: booking.reference_number,
      };
      return {
        reply: bookingAgentMessages.cancelReviewShort(locale, booking.reference_number, rules),
        intent: "propose_cancellation",
        booking,
        cancellation_rules: rules,
        pending_action: pending,
        requires_confirmation: true,
      };
    }
    default:
      return {
        reply: bookingAgentMessages.unknownAction(locale),
        intent: "general",
        requires_confirmation: false,
      };
  }
}

export async function applyPendingAction(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  pending: BookingAgentPendingAction
): Promise<BookingDraftResult> {
  if (pending.type === "create_draft") {
    const result = await executeCreateDraft(supabase, tenantId, userId, pending.preview);
    return {
      booking_id: result.booking_id,
      reference_number: result.reference_number,
      action: "draft_created",
      total_amount: pending.preview.total_amount,
      currency: pending.preview.currency,
    };
  }

  if (pending.type === "update_draft") {
    const result = await executeUpdateDraft(supabase, tenantId, userId, {
      booking_id: pending.booking_id,
      travel_date: pending.travel_date,
      package_id: pending.package_id,
      travelers: pending.travelers,
      notes: pending.notes,
    });
    return {
      booking_id: result.booking_id,
      reference_number: result.reference_number,
      action: "draft_updated",
    };
  }

  if (pending.type === "propose_cancellation") {
    const result = await executeProposeCancellation(
      supabase,
      tenantId,
      userId,
      pending.booking_id,
      pending.reason
    );
    return {
      booking_id: result.booking_id,
      reference_number: result.reference_number,
      action: "cancellation_requested",
    };
  }

  throw new Error("Unsupported pending action");
}

async function lookupBookingById(
  supabase: SupabaseClient,
  bookingId: string
): Promise<BookingDetailResult | null> {
  const { data } = await supabase
    .from("bookings")
    .select("reference_number")
    .eq("id", bookingId)
    .maybeSingle();

  if (!data?.reference_number) return null;
  return lookupBooking(supabase, data.reference_number);
}

async function handleGeneralIntent(
  supabase: SupabaseClient,
  message: string,
  filters: { destination?: string; minPrice?: number; maxPrice?: number; travelDate?: string },
  locale: AiLocale
): Promise<Omit<BookingAgentResponse, "conversation_id" | "session_id" | "message_id">> {
  const ref = extractBookingReference(message);
  if (ref) {
    const booking = await lookupBooking(supabase, ref);
    if (booking) {
      return {
        reply: formatLookupReply(locale, booking),
        intent: "lookup_booking",
        booking,
        requires_confirmation: false,
      };
    }
  }

  const packages = await searchPackages(supabase, filters);
  if (packages.length > 0) {
    const packageReply = formatSearchReply(locale, packages, filters);
    return {
      reply: bookingAgentMessages.generalWithPackages(locale, packageReply),
      intent: "search_packages",
      recommendations: packages,
      requires_confirmation: false,
    };
  }

  return {
    reply: bookingAgentMessages.generalHelp(locale),
    intent: "general",
    requires_confirmation: false,
  };
}

/** Build preview from structured confirm_action before final apply */
export async function previewCreateDraftAction(
  supabase: SupabaseClient,
  action: Extract<BookingAgentAction, { type: "create_draft" }>
): Promise<DraftPreview> {
  return buildDraftPreview(supabase, action);
}

export { formatDraftPreviewReply };
