"use client";

import { useShow } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageItineraryEditor } from "@/components/packages/package-itinerary-editor";
import { PackagePricingEditor } from "@/components/packages/package-pricing-editor";
import { PackageStatusActions } from "@/components/packages/package-status-actions";
import { RecordMetadata } from "@/components/shared/record-metadata";
import { withAuditUserSelect } from "@/lib/audit/record-metadata";
import { useTranslation } from "@/i18n/locale-provider";
import { Package } from "@/types";

export default function PackageShowPage() {
  const { t } = useTranslation();
  const { queryResult } = useShow<Package>({
    resource: "packages",
    meta: { select: withAuditUserSelect("packages", "*, destinations(name)") },
  });
  const pkg = queryResult?.data?.data;

  if (!pkg) return <p>{t("common.loading")}</p>;

  const readOnlyItinerary = pkg.status === "archived";
  const readOnlyPricing = pkg.status === "archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{pkg.title}</h2>
          <div className="mt-2">
            <StatusBadge namespace="packageStatus" value={pkg.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pkg.status !== "archived" && (
            <Link href={`/packages/edit/${pkg.id}`}>
              <Button variant="outline">{t("common.edit")}</Button>
            </Link>
          )}
          {pkg.status !== "archived" && (
            <PackageStatusActions
              packageId={pkg.id}
              status={pkg.status}
              onStatusChange={() => void queryResult?.refetch()}
            />
          )}
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("packages.details")}</CardTitle>
        </CardHeader>
        <dl className="space-y-2 px-6 pb-6 text-sm">
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.destination")}:</dt>
            <dd>{pkg.destinations?.name ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.durationDays")}:</dt>
            <dd>{pkg.duration_days ? `${pkg.duration_days} ${t("common.days")}` : "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 font-medium">{t("fields.description")}:</dt>
            <dd className="text-muted-foreground">{pkg.description ?? "—"}</dd>
          </div>
        </dl>
        <div className="px-6 pb-6">
          <RecordMetadata {...pkg} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PackageItineraryEditor packageId={pkg.id} readOnly={readOnlyItinerary} />
        <PackagePricingEditor packageId={pkg.id} readOnly={readOnlyPricing} />
      </div>

      {pkg.status === "draft" && (
        <p className="text-sm text-muted-foreground">{t("packages.publishHint")}</p>
      )}
    </div>
  );
}
