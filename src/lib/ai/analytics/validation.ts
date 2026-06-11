import { z } from "zod";

export const analyticsQuerySchema = z.object({
  preset: z.enum(["today", "7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

export const analyticsExportQuerySchema = analyticsQuerySchema.extend({
  type: z.enum(["feedback", "usage", "support"]),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsExportQueryInput = z.infer<typeof analyticsExportQuerySchema>;
