"use client";

import { useShow } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Traveler } from "@/types";

export default function TravelerShowPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const { queryResult } = useShow<Traveler>({
    resource: "travelers",
    meta: { select: "*, customers(first_name, last_name, email), countries(name)" },
  });
  const traveler = queryResult?.data?.data;
  if (!traveler) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{traveler.first_name} {traveler.last_name}</h2>
        <Link href={`/travelers/edit/${traveler.id}`}><Button>{t("common.edit")}</Button></Link>
      </div>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("common.profile")}</CardTitle></CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.gender")}:</dt><dd><StatusBadge namespace="gender" value={traveler.gender} /></dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.dateOfBirth")}:</dt><dd>{traveler.date_of_birth ? formatDate(traveler.date_of_birth) : "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.nationality")}:</dt><dd>{traveler.countries?.name ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.customer")}:</dt><dd>
            {traveler.customers ? `${traveler.customers.first_name} ${traveler.customers.last_name}` : t("common.standalone")}
          </dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("travelers.passport")}:</dt><dd>{traveler.passport_number ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.passportExpiry")}:</dt><dd>{traveler.passport_expiry ? formatDate(traveler.passport_expiry) : "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.email")}:</dt><dd>{traveler.email ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.phone")}:</dt><dd>{traveler.phone ?? "—"}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
