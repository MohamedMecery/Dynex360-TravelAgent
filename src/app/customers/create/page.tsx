"use client";

import { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useCreate, useNavigation } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerFormFields } from "@/components/customers/customer-form-fields";
import { isDuplicateEmailError } from "@/lib/customers/duplicate-email";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import {
  customerFormDefaultValues,
  customerFormSchema,
  normalizeCustomerFormValues,
  type CustomerFormValues,
} from "@/lib/validation/customer-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { Customer, CustomerType } from "@/types";

export default function CustomerCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const tenantId = useTenantId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutate: createCustomer, isLoading: formLoading } = useCreate<Customer>();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: customerFormDefaultValues,
  });

  const customerType = (watch("type") ?? "individual") as CustomerType;

  const onSubmit = handleSubmit((values) => {
    if (!tenantId) return;

    setSubmitError(null);
    const parsed = customerFormSchema.safeParse(values as CustomerFormValues);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof CustomerFormValues, { type: "manual", message: issue.message });
        }
      }
      return;
    }

    const normalized = normalizeCustomerFormValues(parsed.data);
    createCustomer(
      {
        resource: "customers",
        values: { ...normalized, tenant_id: tenantId },
      },
      {
        onSuccess: (response) => {
          const id = response.data.id;
          router.push(`/customers/show/${id}`);
        },
        onError: (error: unknown) => {
          if (isDuplicateEmailError(error)) {
            setError("email", { type: "manual", message: "duplicateEmail" });
            setSubmitError(t("customers.duplicateEmail"));
            return;
          }
          setSubmitError(t("customers.createError"));
        },
      }
    );
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("customers.createTitle")}</h2>
      {!tenantId && (
        <div
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {t("customers.tenantRequired")}
        </div>
      )}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("customers.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <CustomerFormFields
            register={register}
            errors={errors}
            customerType={customerType}
            setValue={setValue}
          />
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={formLoading || !tenantId}>
              {formLoading ? t("common.saving") : t("common.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("customers")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
