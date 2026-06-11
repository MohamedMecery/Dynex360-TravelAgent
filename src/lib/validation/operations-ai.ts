import { z } from "zod";

export const operationsAgentRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  locale: z.enum(["en", "ar"]).optional(),
  booking_id: z.string().uuid(),
});

export const opsRecommendationDismissSchema = z.object({
  reason: z.string().max(500).optional(),
});
