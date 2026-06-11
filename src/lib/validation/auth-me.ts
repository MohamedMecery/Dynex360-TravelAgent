import { z } from "zod";

export const authMeQuerySchema = z.object({
  include_permissions: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
});
