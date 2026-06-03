"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity, useList, useUpdate, type CrudFilters } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { PackageStatusActions } from "@/components/packages/package-status-actions";
import { useTranslation } from "@/i18n/locale-provider";
import { Destination, Package, PackageStatus, UserRole } from "@/types";

export default function PackageListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canDelete } = useCan({
    resource: "packages",
    action: "delete",
    params: { role: identity?.role },
  });

  const [statusFilter, setStatusFilter] = useState<PackageStatus | "">("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [searchTitle, setSearchTitle] = useState("");

  const { data: destinationsData } = useList<Destination>({
    resource: "destinations",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
  });
  const destinations = destinationsData?.data ?? [];

  const filters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (statusFilter) {
      next.push({ field: "status", operator: "eq", value: statusFilter });
    }
    if (destinationFilter) {
      next.push({ field: "destination_id", operator: "eq", value: destinationFilter });
    }
    if (searchTitle.trim()) {
      next.push({ field: "title", operator: "contains", value: searchTitle.trim() });
    }
    return next;
  }, [statusFilter, destinationFilter, searchTitle]);

  const { data, isLoading, refetch } = useList<Package>({
    resource: "packages",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "*, destinations(name)" },
  });
  const { mutate: updateOne } = useUpdate();

  const packages = data?.data ?? [];

  const handleSoftDelete = (id: string) => {
    if (!window.confirm(t("packages.confirmDelete"))) return;
    updateOne(
      { resource: "packages", id, values: { deleted_at: new Date().toISOString() } },
      { onSuccess: () => void refetch() }
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("packages.title")}</h2>
        <Link href="/packages/create">
          <Button>{t("packages.create")}</Button>
        </Link>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("packages.searchTitle")}</label>
            <Input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder={t("packages.searchTitlePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.status")}</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PackageStatus | "")}
            >
              <option value="">{t("packages.allStatuses")}</option>
              <option value="draft">{t("packageStatus.draft")}</option>
              <option value="published">{t("packageStatus.published")}</option>
              <option value="archived">{t("packageStatus.archived")}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.destination")}</label>
            <Select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
              <option value="">{t("packages.allDestinations")}</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <p className="p-4">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 pb-2 pt-4">{t("fields.title")}</th>
                  <th className="pb-2 pr-4">{t("fields.destination")}</th>
                  <th className="pb-2 pr-4">{t("fields.durationDays")}</th>
                  <th className="pb-2 pr-4">{t("fields.status")}</th>
                  <th className="px-4 pb-2 pt-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{p.title}</td>
                    <td className="py-2 pr-4">{p.destinations?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {p.duration_days ? `${p.duration_days} ${t("common.days")}` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge namespace="packageStatus" value={p.status} />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <div className="flex min-w-[20rem] flex-wrap gap-2">
                        <GridActionButton href={`/packages/show/${p.id}`} variant="outline" size="sm">
                          {t("common.view")}
                        </GridActionButton>
                        <GridActionButton
                          href={`/packages/edit/${p.id}`}
                          variant="outline"
                          size="sm"
                          disabled={p.status === "archived"}
                        >
                          {t("common.edit")}
                        </GridActionButton>
                        <PackageStatusActions
                          packageId={p.id}
                          status={p.status}
                          size="sm"
                          onStatusChange={() => void refetch()}
                        />
                        {canDelete?.can ? (
                          <Button variant="destructive" size="sm" onClick={() => handleSoftDelete(p.id)}>
                            {t("common.delete")}
                          </Button>
                        ) : (
                          <Button variant="destructive" size="sm" disabled>
                            {t("common.delete")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {packages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      {t("packages.noPackages")}
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
