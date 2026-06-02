"use client";

import { FieldErrors, FieldValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/forms/field-error";
import { FieldLabel } from "@/components/forms/field-label";
import { EMAIL_INPUT_PATTERN } from "@/lib/validation/email";
import type { CustomerFormValues } from "@/lib/validation/customer-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { CustomerType } from "@/types";

interface CustomerFormFieldsProps {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  customerType: CustomerType;
  setValue?: UseFormSetValue<FieldValues>;
}

export function CustomerFormFields({
  register,
  errors,
  customerType,
  setValue,
}: CustomerFormFieldsProps) {
  const { t } = useTranslation();
  const isCorporate = customerType === "corporate";

  const fieldError = (key: string): string | undefined => {
    const fieldErrors = errors as FieldErrors<CustomerFormValues>;
    const code = fieldErrors[key as keyof CustomerFormValues]?.message;
    if (typeof code !== "string") return undefined;
    if (code === "lastNameRequired") return t("customers.lastNameRequired");
    if (code === "companyNameRequired") return t("customers.companyNameRequired");
    if (code === "invalidEmail") return t("customers.invalidEmail");
    if (code === "duplicateEmail") return t("customers.duplicateEmail");
    return code;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("customers.formHint")}</p>

      <div>
        <FieldLabel htmlFor="customer-type" label={t("fields.type")} required />
        <Select
          id="customer-type"
          {...register("type", {
            onChange: (event) => {
              const next = event.target.value as CustomerType;
              if (!setValue) return;
              if (next === "corporate") {
                setValue("last_name", "");
              } else {
                setValue("company_name", "");
              }
            },
          })}
        >
          <option value="individual">{t("customerType.individual")}</option>
          <option value="corporate">{t("customerType.corporate")}</option>
        </Select>
        <FieldError message={fieldError("type")} />
      </div>

      {isCorporate ? (
        <div>
          <FieldLabel htmlFor="company_name" label={t("fields.companyName")} required />
          <Input id="company_name" {...register("company_name")} autoComplete="organization" />
          <FieldError message={fieldError("company_name")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="first_name" label={t("fields.firstName")} />
            <Input id="first_name" {...register("first_name")} autoComplete="given-name" />
            <FieldError message={fieldError("first_name")} />
          </div>
          <div>
            <FieldLabel htmlFor="last_name" label={t("fields.lastName")} required />
            <Input id="last_name" {...register("last_name")} autoComplete="family-name" />
            <FieldError message={fieldError("last_name")} />
          </div>
        </div>
      )}

      <div>
        <FieldLabel htmlFor="email" label={t("fields.email")} />
        <Input
          id="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          pattern={EMAIL_INPUT_PATTERN}
          {...register("email")}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("customers.emailHint")}</p>
        <FieldError message={fieldError("email")} />
      </div>

      <div>
        <FieldLabel htmlFor="phone" label={t("fields.phone")} />
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
        <FieldError message={fieldError("phone")} />
      </div>

      <div>
        <FieldLabel htmlFor="notes" label={t("common.notes")} />
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>
    </div>
  );
}
