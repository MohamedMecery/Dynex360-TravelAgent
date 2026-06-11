import { z } from "zod";

export const timelineBucketSchema = z.enum(["all", "sales", "operations", "support"]);

export const customer360TimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
  bucket: timelineBucketSchema.optional(),
});
