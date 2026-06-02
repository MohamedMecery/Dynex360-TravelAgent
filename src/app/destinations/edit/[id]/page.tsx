"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { City, Country } from "@/types";

export default function DestinationEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();

  const { data: countriesData } = useList<Country>({
    resource: "countries",
    pagination: { pageSize: 200 },
  });
  const { data: citiesData } = useList<City>({
    resource: "cities",
    pagination: { pageSize: 500 },
  });

  const { refineCore: { onFinish, formLoading, queryResult }, register, handleSubmit, watch } = useForm({
    refineCoreProps: { resource: "destinations", action: "edit", redirect: "list" },
  });

  const destination = queryResult?.data?.data;
  const selectedCountry = watch("country_id");
  const filteredCities = (citiesData?.data ?? []).filter((c) => c.country_id === selectedCountry);

  const onSubmit = handleSubmit((values) =>
    onFinish({
      ...values,
      city_id: values.city_id || null,
      description: values.description || null,
    } as never)
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("destinations.editTitle")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>{destination?.name ?? t("common.loading")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label>{t("fields.name")}</Label><Input {...register("name", { required: true })} /></div>
          <div><Label>{t("fields.slug")}</Label><Input {...register("slug", { required: true })} /></div>
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
                <option key={c.id} value={c.id}>{c.name}</option>
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
            <Button type="submit" disabled={formLoading}>{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => list("destinations")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
