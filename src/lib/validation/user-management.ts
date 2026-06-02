import { z } from "zod";
import { ASSIGNABLE_TENANT_ROLES } from "@/lib/users/assignable-roles";

const assignableRoleSchema = z.enum(
  ASSIGNABLE_TENANT_ROLES as [typeof ASSIGNABLE_TENANT_ROLES[number], ...typeof ASSIGNABLE_TENANT_ROLES]
);

export const inviteUserSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  full_name: z.string().min(1).max(255).trim(),
  role: assignableRoleSchema,
});

export const updateUserSchema = z
  .object({
    role: assignableRoleSchema.optional(),
    status: z.enum(["active", "inactive", "pending"]).optional(),
  })
  .refine((body) => body.role !== undefined || body.status !== undefined, {
    message: "At least one of role or status is required",
  });

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
