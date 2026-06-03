"use client";

import { useShow } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordMetadata } from "@/components/shared/record-metadata";
import { withAuditUserSelect } from "@/lib/audit/record-metadata";
import { useTranslation } from "@/i18n/locale-provider";
import { Destination } from "@/types";

export default function DestinationShowPage() {
  const { t } = useTranslation();
  const { queryResult } = useShow<Destination>({
    resource: "destinations",
    meta: { select: withAuditUserSelect("destinations", "*, countries(name), cities(name)") },
  });
  const destination = queryResult?.data?.data;
  if (!destination) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{destination.name}</h2>
        <Link href={`/destinations/edit/${destination.id}`}><Button>{t("common.edit")}</Button></Link>
      </div>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("common.details")}</CardTitle></CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="font-medium w-24">{t("fields.status")}:</dt><dd><StatusBadge namespace="destinationStatus" value={destination.status} /></dd></div>
          <div className="flex gap-2"><dt className="font-medium w-24">{t("fields.slug")}:</dt><dd className="font-mono text-xs">{destination.slug}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-24">{t("fields.country")}:</dt><dd>{destination.countries?.name ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-24">{t("fields.city")}:</dt><dd>{destination.cities?.name ?? "—"}</dd></div>
          <div><dt className="font-medium mb-1">{t("fields.description")}:</dt><dd className="text-muted-foreground">{destination.description ?? "—"}</dd></div>
        </dl>
        <RecordMetadata {...destination} className="mt-4" />
      </Card>
    </div>
  );
}
