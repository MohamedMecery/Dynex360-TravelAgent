import { z } from "zod";

const aiLocaleSchema = z.enum(["en", "ar"]).optional();

export const supportAgentRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000),
  conversation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  locale: aiLocaleSchema,
  customer_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  create_ticket: z.boolean().optional(),
});

export type SupportAgentRequest = z.infer<typeof supportAgentRequestSchema>;
