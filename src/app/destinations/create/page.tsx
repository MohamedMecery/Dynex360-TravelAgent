"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import { useTranslation } from "@/i18n/locale-provider";
import { City, Country } from "@/types";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function DestinationCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const tenantId = useTenantId();

  const { data: countriesData } = useList<Country>({
    resource: "countries",
    pagination: { pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const { data: citiesData } = useList<City>({
    resource: "cities",
    pagination: { pageSize: 500 },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { refineCore: { onFinish, formLoading }, register, handleSubmit, watch, setValue } = useForm({
    refineCoreProps: { resource: "destinations", action: "create", redirect: "list" },
    defaultValues: {
      name: "",
      slug: "",
      country_id: "",
      city_id: "",
      description: "",
      status: "active",
    },
  });

  const selectedCountry = watch("country_id");
  const filteredCities = (citiesData?.data ?? []).filter((c) => c.country_id === selectedCountry);

  const onSubmit = handleSubmit((values) => {
    if (!tenantId) return;
    const slug = values.slug || slugify(values.name);
    return onFinish({
      ...values,
      tenant_id: tenantId,
      slug,
      city_id: values.city_id || null,
      description: values.description || null,
    } as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("destinations.createTitle")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("destinations.details")}</CardTitle></CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>{t("fields.name")}</Label>
            <Input
              {...register("name", { required: true })}
              onBlur={(e) => {
                const currentSlug = watch("slug");
                if (!currentSlug) setValue("slug", slugify(e.target.value));
              }}
            />
          </div>
          <div><Label>{t("fields.slug")}</Label><Input {...register("slug")} placeholder={t("fields.slugHint")} /></div>
          <div>
            <Label>{t("fields.country")}</Label>
            <Select {...register("country_id", { required: true })}>
              <option value="">{t("fields.selectCountry")}</option>
              {(countriesData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("fields.cityOptional")}</Label>
            <Select {...register("city_id")} disabled={!selectedCountry}>
              <option value="">{t("fields.selectCity")}</option>
              {filteredCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.state_region ? `, ${c.state_region}` : ""}</option>
              ))}
            </Select>
          </div>
          <div><Label>{t("fields.description")}</Label><Textarea {...register("description")} /></div>
          <div>
            <Label>{t("fields.status")}</Label>
            <Select {...register("status")}>
              <option value="active">{t("destinationStatus.active")}</option>
              <option value="inactive">{t("destinationStatus.inactive")}</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={formLoading || !tenantId}>{formLoading ? t("common.saving") : t("common.create")}</Button>
            <Button type="button" variant="outline" onClick={() => list("destinations")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
