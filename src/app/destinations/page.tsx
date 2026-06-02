"use client";

import Link from "next/link";
import { useList, useDelete } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { Destination } from "@/types";

export default function DestinationListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useList<Destination>({
    resource: "destinations",
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "*, countries(name), cities(name)" },
  });
  const { mutate: deleteOne } = useDelete();
  const destinations = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("destinations.title")}</h2>
        <Link href="/destinations/create"><Button>{t("destinations.add")}</Button></Link>
      </div>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("fields.name")}</th>
                <th className="pb-2 pr-4">{t("fields.country")}</th>
                <th className="pb-2 pr-4">{t("fields.city")}</th>
                <th className="pb-2 pr-4">{t("fields.status")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{d.name}</td>
                  <td className="py-2 pr-4">{d.countries?.name ?? "—"}</td>
                  <td className="py-2 pr-4">{d.cities?.name ?? "—"}</td>
                  <td className="py-2 pr-4"><StatusBadge namespace="destinationStatus" value={d.status} /></td>
                  <td className="py-2 flex gap-2">
                    <Link href={`/destinations/show/${d.id}`}><Button variant="outline" size="sm">{t("common.view")}</Button></Link>
                    <Link href={`/destinations/edit/${d.id}`}><Button variant="outline" size="sm">{t("common.edit")}</Button></Link>
                    <Button variant="destructive" size="sm" onClick={() => deleteOne({ resource: "destinations", id: d.id })}>{t("common.delete")}</Button>
                  </td>
                </tr>
              ))}
              {destinations.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">{t("destinations.noDestinations")}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
