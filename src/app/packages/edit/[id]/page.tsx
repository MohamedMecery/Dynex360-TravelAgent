"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageFormFields } from "@/components/packages/package-form-fields";
import {
  packageFormSchema,
  normalizePackageFormValues,
  type PackageFormValues,
} from "@/lib/validation/package-form";
import { useTranslation } from "@/i18n/locale-provider";
import { Destination } from "@/types";

export default function PackageEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const { data: destinationsData } = useList<Destination>({
    resource: "destinations",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
  });
  const destinations = destinationsData?.data ?? [];

  const {
    refineCore: { onFinish, formLoading, queryResult },
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PackageFormValues>({
    refineCoreProps: { resource: "packages", action: "edit", redirect: "show" },
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = packageFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof PackageFormValues, { type: "manual", message: issue.message });
        }
      }
      return;
    }

    return onFinish(normalizePackageFormValues(parsed.data) as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("packages.editTitle")}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{queryResult?.data?.data?.title ?? t("common.loading")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <PackageFormFields register={register} errors={errors} destinations={destinations} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={formLoading}>
              {formLoading ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("packages")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
