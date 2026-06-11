import { z } from "zod";

export const salesAgentRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  locale: z.enum(["en", "ar"]).optional(),
  entity_type: z.enum(["lead", "opportunity", "customer"]).optional(),
  entity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
});

export const recommendationDismissSchema = z.object({
  reason: z.string().max(500).optional(),
});
