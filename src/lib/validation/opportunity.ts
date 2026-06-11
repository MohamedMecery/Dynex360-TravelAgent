import { z } from "zod";

const opportunityStageEnum = z.enum([
  "discovery",
  "proposal",
  "negotiation",
  "verbal_approval",
  "closed_won",
  "closed_lost",
]);

const leadSourceEnum = z.enum([
  "whatsapp",
  "website",
  "facebook",
  "instagram",
  "tiktok",
  "referral",
  "walk_in",
  "phone_call",
  "other",
]);

const preferredChannelEnum = z.enum(["whatsapp", "phone", "email", "in_person"]);

export const opportunityCreateSchema = z.object({
  lead_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  destination_id: z.string().uuid().optional().nullable(),
  destination_text: z.string().max(255).optional().nullable(),
  expected_budget: z.number().nonnegative().optional().nullable(),
  estimated_revenue: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  expected_travel_date: z.string().date().optional().nullable(),
  pax_count: z.number().int().positive().optional(),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  expected_close_date: z.string().date().optional().nullable(),
  stage: opportunityStageEnum.optional(),
  owner_id: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
  lead_source: leadSourceEnum.optional().nullable(),
  preferred_contact_channel: preferredChannelEnum.optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

export const opportunityCreateBookingSchema = z
  .object({
    package_id: z.string().uuid().optional(),
    travel_date: z.string().date().optional(),
    notes: z.string().optional(),
    line_items: z
      .array(
        z.object({
          description: z.string().min(1).max(255),
          quantity: z.number().int().positive(),
          unit_price: z.number().nonnegative(),
        })
      )
      .optional(),
    travelers: z
      .array(
        z.object({
          first_name: z.string().min(1),
          last_name: z.string().min(1),
          tier: z.enum(["adult", "child", "infant"]).optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(data.package_id) ||
      (data.line_items && data.line_items.length > 0),
    { message: "package_id or line_items required for booking draft" }
  );

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityCreateBookingInput = z.infer<typeof opportunityCreateBookingSchema>;
