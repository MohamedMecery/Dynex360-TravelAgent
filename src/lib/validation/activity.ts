import { z } from "zod";
import { DIRECTIONAL_ACTIVITY_TYPES } from "@/lib/crm/timeline-events";

const activityTypeSchema = z.enum([
  "call",
  "whatsapp",
  "email",
  "meeting",
  "task",
]);

const activityDirectionSchema = z.enum(["incoming", "outgoing"]);

const activityStatusSchema = z.enum([
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);

const relatedRefine = {
  message: "At least one related record is required",
  path: ["related_lead_id"],
};

function directionRefine(
  data: { activity_type?: string; direction?: string | null },
  ctx: z.RefinementCtx
): void {
  const type = data.activity_type;
  if (!type) return;
  const needsDirection = (DIRECTIONAL_ACTIVITY_TYPES as readonly string[]).includes(
    type
  );
  if (needsDirection && !data.direction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Direction is required for call, WhatsApp, and email activities",
      path: ["direction"],
    });
  }
  if (!needsDirection && data.direction != null && data.direction !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Direction applies only to call, WhatsApp, and email activities",
      path: ["direction"],
    });
  }
}

export const activityCreateSchema = z
  .object({
    activity_type: activityTypeSchema,
    direction: activityDirectionSchema.optional().nullable(),
    subject: z.string().min(1).max(255),
    description: z.string().max(5000).optional().nullable(),
    due_date: z.string().datetime().optional().nullable(),
    assigned_to: z.string().uuid().optional(),
    related_lead_id: z.string().uuid().optional().nullable(),
    related_opportunity_id: z.string().uuid().optional().nullable(),
    related_customer_id: z.string().uuid().optional().nullable(),
    status: activityStatusSchema.optional(),
    channel_meta: z.record(z.unknown()).optional(),
  })
  .refine(
    (v) =>
      Boolean(v.related_lead_id || v.related_opportunity_id || v.related_customer_id),
    relatedRefine
  )
  .superRefine(directionRefine);

export const activityUpdateSchema = z
  .object({
    activity_type: activityTypeSchema.optional(),
    direction: activityDirectionSchema.optional().nullable(),
    subject: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    due_date: z.string().datetime().optional().nullable(),
    assigned_to: z.string().uuid().optional(),
    related_lead_id: z.string().uuid().optional().nullable(),
    related_opportunity_id: z.string().uuid().optional().nullable(),
    related_customer_id: z.string().uuid().optional().nullable(),
    status: activityStatusSchema.optional(),
    channel_meta: z.record(z.unknown()).optional(),
  })
  .refine(
    (v) => {
      const keys = [
        "related_lead_id",
        "related_opportunity_id",
        "related_customer_id",
      ] as const;
      const touched = keys.some((k) => v[k] !== undefined);
      if (!touched) return true;
      return Boolean(
        v.related_lead_id || v.related_opportunity_id || v.related_customer_id
      );
    },
    relatedRefine
  )

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export const activityListViewSchema = z.enum([
  "timeline",
  "upcoming",
  "overdue",
  "my",
]);

export type ActivityListView = z.infer<typeof activityListViewSchema>;
