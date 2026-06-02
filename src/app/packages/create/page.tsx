"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageFormFields } from "@/components/packages/package-form-fields";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import {
  packageFormDefaultValues,
  packageFormSchema,
  normalizePackageFormValues,
  type PackageFormValues,
} from "@/lib/validation/package-form";
import { useTranslation } from "@/i18n/locale-provider";
import { Destination } from "@/types";

export default function PackageCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const tenantId = useTenantId();
  const { data: destinationsData } = useList<Destination>({
    resource: "destinations",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
  });
  const destinations = destinationsData?.data ?? [];

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PackageFormValues>({
    refineCoreProps: { resource: "packages", action: "create", redirect: "show" },
    defaultValues: packageFormDefaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    if (!tenantId) return;

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

    const normalized = normalizePackageFormValues(parsed.data);
    return onFinish({
      ...normalized,
      tenant_id: tenantId,
      status: "draft",
    } as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("packages.createTitle")}</h2>
      {!tenantId && (
        <div
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {t("packages.tenantRequired")}
        </div>
      )}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("packages.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <PackageFormFields register={register} errors={errors} destinations={destinations} />
          <p className="text-xs text-muted-foreground">{t("packages.createHint")}</p>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={formLoading || !tenantId}>
              {formLoading ? t("common.saving") : t("common.create")}
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
