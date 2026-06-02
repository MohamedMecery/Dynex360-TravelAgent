import { z } from "zod";

const aiLocaleSchema = z.enum(["en", "ar"]).optional();

const travelerInputSchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  tier: z.enum(["adult", "child", "infant"]).default("adult"),
  traveler_id: z.string().uuid().optional(),
});

const pricingLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  tier: z.enum(["adult", "child", "infant"]),
});

const draftPreviewSchema = z.object({
  customer_id: z.string().uuid(),
  package_id: z.string().uuid(),
  travel_date: z.string(),
  travelers: z.array(travelerInputSchema),
  line_items: z.array(pricingLineItemSchema),
  total_amount: z.number(),
  currency: z.string(),
  package_title: z.string(),
  customer_name: z.string(),
  notes: z.string().optional(),
});

export const bookingAgentPendingActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_draft"),
    preview: draftPreviewSchema,
  }),
  z.object({
    type: z.literal("update_draft"),
    booking_id: z.string().uuid(),
    reference_number: z.string().optional(),
    travel_date: z.string().optional(),
    package_id: z.string().uuid().optional(),
    travelers: z.array(travelerInputSchema).optional(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("propose_cancellation"),
    booking_id: z.string().uuid(),
    reason: z.string(),
    reference_number: z.string().optional(),
  }),
]);

export const bookingAgentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_draft"),
    customer_id: z.string().uuid(),
    package_id: z.string().uuid(),
    travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelers: z.array(travelerInputSchema).min(1),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("update_draft"),
    booking_id: z.string().uuid(),
    travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    package_id: z.string().uuid().optional(),
    travelers: z.array(travelerInputSchema).optional(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("propose_cancellation"),
    booking_id: z.string().uuid(),
    reason: z.string().trim().min(1),
  }),
]);

export const bookingAgentRequestSchema = z
  .object({
    message: z.string().trim().max(4000).optional(),
    conversation_id: z.string().uuid().optional(),
    session_id: z.string().uuid().optional(),
    locale: aiLocaleSchema,
    confirm_action: bookingAgentActionSchema.optional(),
    apply_action: bookingAgentPendingActionSchema.optional(),
    filters: z
      .object({
        destination: z.string().trim().optional(),
        min_price: z.number().nonnegative().optional(),
        max_price: z.number().nonnegative().optional(),
        travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(data.message?.trim()) || Boolean(data.confirm_action) || Boolean(data.apply_action),
    { message: "message, confirm_action, or apply_action is required" }
  );

export type BookingAgentRequest = z.infer<typeof bookingAgentRequestSchema>;
export type BookingAgentAction = z.infer<typeof bookingAgentActionSchema>;
export type BookingAgentPendingActionInput = z.infer<typeof bookingAgentPendingActionSchema>;
export type TravelerInput = z.infer<typeof travelerInputSchema>;
