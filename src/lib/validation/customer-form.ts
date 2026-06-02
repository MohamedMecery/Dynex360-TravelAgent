import { z } from "zod";
import { isValidEmail } from "@/lib/validation/email";

export const customerFormSchema = z
  .object({
    type: z.enum(["individual", "corporate"]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "individual") {
      if (!data.last_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["last_name"],
          message: "lastNameRequired",
        });
      }
    } else if (!data.company_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company_name"],
        message: "companyNameRequired",
      });
    }

    const email = data.email?.trim();
    if (email && !isValidEmail(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "invalidEmail",
      });
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const customerFormDefaultValues: CustomerFormValues = {
  type: "individual",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company_name: "",
  notes: "",
};

export interface CustomerRecordPayload {
  type: CustomerFormValues["type"];
  first_name?: string;
  last_name?: string;
  company_name?: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export function normalizeCustomerFormValues(values: CustomerFormValues): CustomerRecordPayload {
  return {
    type: values.type,
    first_name: values.first_name?.trim() || undefined,
    last_name: values.type === "individual" ? values.last_name?.trim() || undefined : undefined,
    company_name: values.type === "corporate" ? values.company_name?.trim() || undefined : null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}
