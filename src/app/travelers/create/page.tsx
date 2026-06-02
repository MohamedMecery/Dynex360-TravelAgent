"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import { useTranslation } from "@/i18n/locale-provider";
import { Country, Customer } from "@/types";

export default function TravelerCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const tenantId = useTenantId();

  const { data: customersData } = useList<Customer>({
    resource: "customers",
    pagination: { pageSize: 200 },
    sorters: [{ field: "last_name", order: "asc" }],
  });
  const { data: countriesData } = useList<Country>({
    resource: "countries",
    pagination: { pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { refineCore: { onFinish, formLoading }, register, handleSubmit } = useForm({
    refineCoreProps: { resource: "travelers", action: "create", redirect: "list" },
    defaultValues: {
      first_name: "",
      last_name: "",
      customer_id: "",
      gender: "unspecified",
      nationality_country_id: "",
      passport_number: "",
      passport_expiry: "",
      date_of_birth: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!tenantId) return;
    return onFinish({
      ...values,
      tenant_id: tenantId,
      customer_id: values.customer_id || null,
      nationality_country_id: values.nationality_country_id || null,
      passport_expiry: values.passport_expiry || null,
      date_of_birth: values.date_of_birth || null,
      email: values.email || null,
      phone: values.phone || null,
    } as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("travelers.createTitle")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("travelers.details")}</CardTitle></CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.firstName")}</Label><Input {...register("first_name", { required: true })} /></div>
            <div><Label>{t("fields.lastName")}</Label><Input {...register("last_name", { required: true })} /></div>
          </div>
          <div>
            <Label>{t("fields.customerOptional")}</Label>
            <Select {...register("customer_id")}>
              <option value="">{t("travelers.standaloneTraveler")}</option>
              {(customersData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("fields.gender")}</Label>
            <Select {...register("gender")}>
              <option value="unspecified">{t("gender.unspecified")}</option>
              <option value="male">{t("gender.male")}</option>
              <option value="female">{t("gender.female")}</option>
              <option value="other">{t("gender.other")}</option>
            </Select>
          </div>
          <div><Label>{t("fields.dateOfBirth")}</Label><Input type="date" {...register("date_of_birth")} /></div>
          <div>
            <Label>{t("fields.nationality")}</Label>
            <Select {...register("nationality_country_id")}>
              <option value="">{t("fields.selectCountry")}</option>
              {(countriesData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.passportNumber")}</Label><Input {...register("passport_number")} /></div>
            <div><Label>{t("fields.passportExpiry")}</Label><Input type="date" {...register("passport_expiry")} /></div>
          </div>
          <div><Label>{t("fields.email")}</Label><Input type="email" {...register("email")} /></div>
          <div><Label>{t("fields.phone")}</Label><Input {...register("phone")} /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={formLoading || !tenantId}>{formLoading ? t("common.saving") : t("common.create")}</Button>
            <Button type="button" variant="outline" onClick={() => list("travelers")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
