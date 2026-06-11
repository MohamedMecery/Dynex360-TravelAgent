import { z } from "zod";

const bookingStatusEnum = z.enum(["draft", "confirmed", "completed", "cancelled"]);
const paymentStatusEnum = z.enum(["unpaid", "partial", "paid"]);

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: bookingStatusEnum.optional(),
  payment_status: paymentStatusEnum.optional(),
  customer_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_from must be YYYY-MM-DD")
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_to must be YYYY-MM-DD")
    .optional(),
  search: z.string().max(100).optional(),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const authMeQuerySchema = z.object({
  include_permissions: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
});
