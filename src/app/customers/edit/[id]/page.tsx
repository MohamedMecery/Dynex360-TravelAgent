"use client";

import { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigation, useShow, useUpdate } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerFormFields } from "@/components/customers/customer-form-fields";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { isDuplicateEmailError } from "@/lib/customers/duplicate-email";
import {
  customerFormDefaultValues,
  customerFormSchema,
  normalizeCustomerFormValues,
  type CustomerFormValues,
} from "@/lib/validation/customer-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { Customer, CustomerType } from "@/types";

export default function CustomerEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { queryResult } = useShow<Customer>({ resource: "customers" });
  const customerRecord = queryResult?.data?.data;

  const { mutate: updateCustomer, isLoading: formLoading } = useUpdate<Customer>();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    refineCoreProps: { resource: "customers", action: "edit" },
    defaultValues: customerFormDefaultValues,
  });

  const customerType = (watch("type") ?? customerRecord?.type ?? "individual") as CustomerType;

  const onSubmit = handleSubmit((values) => {
    if (!customerRecord?.id) return;

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
    updateCustomer(
      {
        resource: "customers",
        id: customerRecord.id,
        values: normalized,
      },
      {
        onSuccess: () => {
          router.push(`/customers/show/${customerRecord.id}`);
        },
        onError: (error: unknown) => {
          if (isDuplicateEmailError(error)) {
            setError("email", { type: "manual", message: "duplicateEmail" });
            setSubmitError(t("customers.duplicateEmail"));
            return;
          }
          setSubmitError(t("customers.updateError"));
        },
      }
    );
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("customers.editTitle")}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>
            {customerRecord ? getCustomerDisplayName(customerRecord) : t("common.loading")}
          </CardTitle>
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
            <Button type="submit" disabled={formLoading || !customerRecord}>
              {formLoading ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                customerRecord
                  ? router.push(`/customers/show/${customerRecord.id}`)
                  : list("customers")
              }
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
