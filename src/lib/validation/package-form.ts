import { z } from "zod";
import type { PricingTier } from "@/types";

export const packageFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "titleRequired")
    .max(255, "titleTooLong"),
  description: z.string().optional(),
  destination_id: z.string().optional(),
  duration_days: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().positive().optional()
  ),
});

export type PackageFormValues = z.infer<typeof packageFormSchema>;

export const packageFormDefaultValues: PackageFormValues = {
  title: "",
  description: "",
  destination_id: "",
  duration_days: undefined,
};

export interface PackageRecordPayload {
  title: string;
  description?: string | null;
  destination_id?: string | null;
  duration_days?: number | null;
  status?: "draft" | "published" | "archived";
}

export function normalizePackageFormValues(values: PackageFormValues): PackageRecordPayload {
  const destinationId = values.destination_id?.trim();
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    destination_id: destinationId || null,
    duration_days: values.duration_days ?? null,
  };
}

export const packageDaySchema = z.object({
  day_number: z.coerce.number().int().positive("dayNumberInvalid"),
  title: z
    .string()
    .trim()
    .min(1, "titleRequired")
    .max(255, "titleTooLong"),
  description: z.string().optional(),
});

export type PackageDayFormValues = z.infer<typeof packageDaySchema>;

export const PRICING_TIERS: PricingTier[] = ["adult", "child", "infant"];

export const packagePricingSchema = z.object({
  adult: z.coerce.number().min(0, "amountInvalid").optional(),
  child: z.coerce.number().min(0, "amountInvalid").optional(),
  infant: z.coerce.number().min(0, "amountInvalid").optional(),
  currency: z.string().length(3).default("USD"),
});

export type PackagePricingFormValues = z.infer<typeof packagePricingSchema>;
