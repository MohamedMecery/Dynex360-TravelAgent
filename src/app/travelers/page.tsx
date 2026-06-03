"use client";

import Link from "next/link";
import { useCan, useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { useTranslation } from "@/i18n/locale-provider";
import { Traveler, UserRole } from "@/types";

export default function TravelerListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canDelete } = useCan({
    resource: "travelers",
    action: "delete",
    params: { role: identity?.role },
  });
  const { data, isLoading } = useList<Traveler>({
    resource: "travelers",
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "*, customers(first_name, last_name), countries(name)" },
  });
  const { mutate: softDelete } = useUpdate();
  const travelers = data?.data ?? [];

  const handleSoftDelete = (id: string) => {
    if (!confirm(t("travelers.confirmDelete"))) return;
    softDelete({
      resource: "travelers",
      id,
      values: { deleted_at: new Date().toISOString() },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("travelers.title")}</h2>
        <Link href="/travelers/create"><Button>{t("travelers.add")}</Button></Link>
      </div>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("fields.name")}</th>
                <th className="pb-2 pr-4">{t("fields.customer")}</th>
                <th className="pb-2 pr-4">{t("fields.nationality")}</th>
                <th className="pb-2 pr-4">{t("travelers.passport")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {travelers.map((traveler) => (
                <tr key={traveler.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{traveler.first_name} {traveler.last_name}</td>
                  <td className="py-2 pr-4">
                    {traveler.customers ? `${traveler.customers.first_name ?? ""} ${traveler.customers.last_name ?? ""}`.trim() : "—"}
                  </td>
                  <td className="py-2 pr-4">{traveler.countries?.name ?? "—"}</td>
                  <td className="py-2 pr-4">{traveler.passport_number ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <GridActionButton href={`/travelers/show/${traveler.id}`} variant="outline" size="sm">
                        {t("common.view")}
                      </GridActionButton>
                      <GridActionButton href={`/travelers/edit/${traveler.id}`} variant="outline" size="sm">
                        {t("common.edit")}
                      </GridActionButton>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canDelete?.can}
                        onClick={() => canDelete?.can && handleSoftDelete(traveler.id)}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {travelers.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">{t("travelers.noTravelers")}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
