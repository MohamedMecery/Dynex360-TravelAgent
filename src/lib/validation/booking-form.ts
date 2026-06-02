import { z } from "zod";
import type { PricingTier } from "@/types";

export const bookingTravelerRowSchema = z.object({
  first_name: z.string().trim().min(1, "firstNameRequired"),
  last_name: z.string().trim().min(1, "lastNameRequired"),
  tier: z.enum(["adult", "child", "infant"]),
});

export const bookingFormSchema = z.object({
  customer_id: z.string().uuid("customerRequired"),
  package_id: z.string().uuid("packageRequired"),
  travel_date: z.string().min(1, "travelDateRequired"),
  notes: z.string().optional(),
  travelers: z.array(bookingTravelerRowSchema).min(1, "travelersRequired"),
});

export type BookingTravelerRowValues = z.infer<typeof bookingTravelerRowSchema>;
export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export const defaultTravelerRow = (): BookingTravelerRowValues => ({
  first_name: "",
  last_name: "",
  tier: "adult",
});

export function toTravelerInputs(rows: BookingTravelerRowValues[]): {
  first_name: string;
  last_name: string;
  tier: PricingTier;
}[] {
  return rows.map((row) => ({
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    tier: row.tier,
  }));
}
