import { z } from "zod";

export const updateSupportTicketSchema = z
  .object({
    status: z.enum(["open", "pending", "escalated", "resolved", "closed"]).optional(),
    assigned_user_id: z.string().uuid().nullable().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    escalate: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.assigned_user_id !== undefined ||
      data.priority !== undefined ||
      data.escalate === true,
    { message: "At least one field is required" }
  );

export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;
