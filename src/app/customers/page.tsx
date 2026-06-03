"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useCan,
  useGetIdentity,
  useList,
  useUpdate,
  type CrudFilters,
} from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { useTranslation } from "@/i18n/locale-provider";
import { Customer, CustomerType, UserRole } from "@/types";

export default function CustomerListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canDelete } = useCan({
    resource: "customers",
    action: "delete",
    params: { role: identity?.role },
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "">("");

  const filters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (typeFilter) {
      next.push({ field: "type", operator: "eq", value: typeFilter });
    }
    if (search.trim()) {
      next.push({
        operator: "or",
        value: [
          { field: "first_name", operator: "contains", value: search.trim() },
          { field: "last_name", operator: "contains", value: search.trim() },
          { field: "email", operator: "contains", value: search.trim() },
          { field: "phone", operator: "contains", value: search.trim() },
          { field: "company_name", operator: "contains", value: search.trim() },
        ],
      });
    }
    return next;
  }, [search, typeFilter]);

  const { data, isLoading, refetch } = useList<Customer>({
    resource: "customers",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });
  const { mutate: updateOne } = useUpdate();

  const customers = data?.data ?? [];

  const handleSoftDelete = (id: string) => {
    if (!window.confirm(t("customers.confirmDelete"))) return;
    updateOne(
      { resource: "customers", id, values: { deleted_at: new Date().toISOString() } },
      { onSuccess: () => void refetch() }
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("customers.title")}</h2>
        <Link href="/customers/create">
          <Button>{t("customers.create")}</Button>
        </Link>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("customers.search")}</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("customers.searchPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.type")}</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CustomerType | "")}
            >
              <option value="">{t("customers.allTypes")}</option>
              <option value="individual">{t("customerType.individual")}</option>
              <option value="corporate">{t("customerType.corporate")}</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <p className="p-4 text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 pb-2 pt-4">{t("fields.name")}</th>
                  <th className="pb-2 pr-4">{t("fields.email")}</th>
                  <th className="pb-2 pr-4">{t("fields.phone")}</th>
                  <th className="pb-2 pr-4">{t("fields.type")}</th>
                  <th className="px-4 pb-2 pt-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{getCustomerDisplayName(c)}</td>
                    <td className="py-2 pr-4">{c.email ?? "—"}</td>
                    <td className="py-2 pr-4">{c.phone ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge namespace="customerType" value={c.type} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <GridActionButton href={`/customers/show/${c.id}`} variant="outline" size="sm">
                          {t("common.view")}
                        </GridActionButton>
                        <GridActionButton href={`/customers/edit/${c.id}`} variant="outline" size="sm">
                          {t("common.edit")}
                        </GridActionButton>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!canDelete?.can}
                          onClick={() => canDelete?.can && handleSoftDelete(c.id)}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      {t("customers.noCustomers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
