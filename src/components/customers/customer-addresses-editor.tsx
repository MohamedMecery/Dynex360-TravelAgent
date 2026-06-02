"use client";

import { useCallback, useMemo, useState } from "react";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import {
  customerAddressSchema,
  emptyAddressForm,
  type CustomerAddressFormValues,
} from "@/lib/validation/customer-nested-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { AddressType, City, Country, CustomerAddress } from "@/types";

interface CustomerAddressesEditorProps {
  customerId: string;
}

export function CustomerAddressesEditor({ customerId }: CustomerAddressesEditorProps) {
  const { t } = useTranslation();
  const tenantId = useTenantId();
  const [form, setForm] = useState<CustomerAddressFormValues>(emptyAddressForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const { data, isLoading, refetch } = useList<CustomerAddress>({
    resource: "customer_addresses",
    filters: [{ field: "customer_id", operator: "eq", value: customerId }],
    sorters: [{ field: "created_at", order: "asc" }],
    pagination: { pageSize: 100 },
    meta: { select: "*, countries(name), cities(name)" },
  });

  const { mutate: createAddress, isLoading: creating } = useCreate();
  const { mutate: updateAddress, isLoading: updating } = useUpdate();
  const { mutate: deleteAddress } = useDelete();

  const addresses = data?.data ?? [];
  const countries = countriesData?.data ?? [];
  const filteredCities = useMemo(
    () => (citiesData?.data ?? []).filter((city) => city.country_id === form.country_id),
    [citiesData?.data, form.country_id]
  );

  const resetForm = useCallback(() => {
    setForm(emptyAddressForm());
    setEditingId(null);
    setFormError(null);
  }, []);

  const startEdit = (address: CustomerAddress) => {
    setEditingId(address.id);
    setForm({
      type: address.type,
      street: address.street ?? "",
      country_id: address.country_id ?? "",
      city_id: address.city_id ?? "",
      postal_code: address.postal_code ?? "",
    });
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId) return;

    const parsed = customerAddressSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(t("customers.addressValidationError"));
      return;
    }

    const values = parsed.data;
    const payload = {
      type: values.type,
      street: values.street?.trim() || null,
      country_id: values.country_id || null,
      city_id: values.city_id || null,
      postal_code: values.postal_code?.trim() || null,
    };

    if (editingId) {
      updateAddress(
        { resource: "customer_addresses", id: editingId, values: payload },
        {
          onSuccess: () => {
            resetForm();
            void refetch();
          },
          onError: () => setFormError(t("customers.addressSaveError")),
        }
      );
      return;
    }

    createAddress(
      {
        resource: "customer_addresses",
        values: { ...payload, customer_id: customerId, tenant_id: tenantId },
      },
      {
        onSuccess: () => {
          resetForm();
          void refetch();
        },
        onError: () => setFormError(t("customers.addressSaveError")),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t("customers.confirmDeleteAddress"))) return;
    deleteAddress({ resource: "customer_addresses", id }, { onSuccess: () => void refetch() });
  };

  const formatAddressLine = (address: CustomerAddress): string => {
    const parts = [
      address.street,
      address.cities?.name,
      address.countries?.name,
      address.postal_code,
    ].filter(Boolean);
    return parts.join(", ") || "—";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t("customers.addresses")}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
          {t("customers.addAddress")}
        </Button>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("customers.noAddresses")}</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((address) => (
              <li key={address.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{t(`addressType.${address.type}`)}</p>
                    <p className="mt-1 text-muted-foreground">{formatAddressLine(address)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(address)}>
                      {t("common.edit")}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(address.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">
            {editingId ? t("customers.editAddress") : t("customers.addAddress")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("customers.addressType")}</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as AddressType }))}
              >
                <option value="billing">{t("addressType.billing")}</option>
                <option value="mailing">{t("addressType.mailing")}</option>
                <option value="other">{t("addressType.other")}</option>
              </Select>
            </div>
            <div>
              <Label>{t("customers.street")}</Label>
              <Input value={form.street ?? ""} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
            </div>
            <div>
              <Label>{t("fields.country")}</Label>
              <Select
                value={form.country_id ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, country_id: e.target.value, city_id: "" }))}
              >
                <option value="">{t("fields.selectCountry")}</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("fields.city")}</Label>
              <Select
                value={form.city_id ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, city_id: e.target.value }))}
                disabled={!form.country_id}
              >
                <option value="">{t("fields.selectCity")}</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("customers.postalCode")}</Label>
              <Input
                value={form.postal_code ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || updating || !tenantId}>
              {creating || updating ? t("common.saving") : editingId ? t("common.save") : t("common.create")}
            </Button>
            {(editingId || form.street) && (
              <Button type="button" variant="outline" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
