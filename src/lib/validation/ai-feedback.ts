import { z } from "zod";

export const aiFeedbackRequestSchema = z.object({
  message_id: z.string().uuid(),
  rating: z.enum(["helpful", "not_helpful"]),
  comment: z.string().trim().max(1000).optional(),
});

export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
