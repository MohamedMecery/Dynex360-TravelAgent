"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { FieldError } from "@/components/forms/field-error";
import { FieldLabel } from "@/components/forms/field-label";
import { useTranslation } from "@/i18n/locale-provider";
import type { PackageFormValues } from "@/lib/validation/package-form";
import type { Destination } from "@/types";

interface PackageFormFieldsProps {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  destinations: Destination[];
}

export function PackageFormFields({ register, errors, destinations }: PackageFormFieldsProps) {
  const { t } = useTranslation();

  const fieldError = (key: keyof PackageFormValues): string | undefined => {
    const fieldErrors = errors as FieldErrors<PackageFormValues>;
    const code = fieldErrors[key]?.message;
    if (typeof code !== "string") return undefined;
    if (code === "titleRequired") return t("packages.titleRequired");
    if (code === "titleTooLong") return t("packages.titleTooLong");
    return code;
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="package-title" label={t("fields.title")} required />
        <Input id="package-title" {...register("title")} />
        <FieldError message={fieldError("title")} />
      </div>
      <div>
        <FieldLabel htmlFor="package-description" label={t("fields.description")} />
        <Textarea id="package-description" {...register("description")} rows={4} />
      </div>
      <div>
        <Label>{t("fields.destination")}</Label>
        <Select {...register("destination_id")}>
          <option value="">{t("fields.selectDestination")}</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="package-duration" label={t("fields.durationDays")} />
        <Input id="package-duration" type="number" min={1} {...register("duration_days")} />
      </div>
    </div>
  );
}
