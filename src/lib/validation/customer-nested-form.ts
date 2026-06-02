import { z } from "zod";
import { isValidEmail } from "@/lib/validation/email";

export const customerContactSchema = z
  .object({
    name: z.string().trim().min(1, "nameRequired").max(255, "nameTooLong"),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim();
    if (email && !isValidEmail(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "invalidEmail",
      });
    }
  });

export type CustomerContactFormValues = z.infer<typeof customerContactSchema>;

export const customerAddressSchema = z.object({
  type: z.enum(["billing", "mailing", "other"]),
  street: z.string().optional(),
  country_id: z.string().optional(),
  city_id: z.string().optional(),
  postal_code: z.string().optional(),
});

export type CustomerAddressFormValues = z.infer<typeof customerAddressSchema>;

export const emptyContactForm = (): CustomerContactFormValues => ({
  name: "",
  email: "",
  phone: "",
  role: "",
});

export const emptyAddressForm = (): CustomerAddressFormValues => ({
  type: "billing",
  street: "",
  country_id: "",
  city_id: "",
  postal_code: "",
});
