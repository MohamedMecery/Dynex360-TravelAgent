import { z } from "zod";

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

const leadStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);

export const leadCreateSchema = z.object({
  full_name: z.string().min(1).max(200),
  mobile: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  preferred_contact_channel: preferredChannelEnum.optional(),
  source: leadSourceEnum,
  destination_id: z.string().uuid().optional().nullable(),
  destination_text: z.string().max(255).optional().nullable(),
  expected_budget: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  travel_date: z.string().date().optional().nullable(),
  pax_count: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional(),
  status: leadStatusEnum.optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  customer_id: z.string().uuid().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
});

export const leadAssignSchema = z.object({
  owner_id: z.string().uuid(),
});

export const leadConvertCustomerSchema = z.object({
  link_existing_customer_id: z.string().uuid().optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
