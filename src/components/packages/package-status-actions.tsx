"use client";

import { useState } from "react";
import { useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { getPackagePublishReadiness } from "@/lib/packages/publish-readiness";
import { useTranslation } from "@/i18n/locale-provider";
import type { PackageStatus } from "@/types";

interface PackageStatusActionsProps {
  packageId: string;
  status: PackageStatus;
  onStatusChange?: () => void;
  size?: "sm" | "md";
}

export function PackageStatusActions({
  packageId,
  status,
  onStatusChange,
  size = "md",
}: PackageStatusActionsProps) {
  const { t } = useTranslation();
  const { mutate: updateOne, isLoading } = useUpdate();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handlePublish = async () => {
    setError(null);
    setChecking(true);
    try {
      const readiness = await getPackagePublishReadiness(packageId);
      if (!readiness.canPublish) {
        if (!readiness.hasItinerary && !readiness.hasPricing) {
          setError(t("packages.publishNeedsBoth"));
        } else if (!readiness.hasItinerary) {
          setError(t("packages.publishNeedsItinerary"));
        } else {
          setError(t("packages.publishNeedsPricing"));
        }
        return;
      }

      updateOne(
        { resource: "packages", id: packageId, values: { status: "published" } },
        {
          onSuccess: () => {
            setError(null);
            onStatusChange?.();
          },
          onError: () => setError(t("packages.publishError")),
        }
      );
    } finally {
      setChecking(false);
    }
  };

  const handleArchive = () => {
    setError(null);
    updateOne(
      { resource: "packages", id: packageId, values: { status: "archived" } },
      {
        onSuccess: () => onStatusChange?.(),
        onError: () => setError(t("packages.archiveError")),
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button size={size} onClick={() => void handlePublish()} disabled={isLoading || checking}>
            {checking || isLoading ? t("common.loading") : t("packages.publish")}
          </Button>
        )}
        {status === "published" && (
          <Button size={size} variant="outline" onClick={handleArchive} disabled={isLoading}>
            {t("packages.archive")}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
