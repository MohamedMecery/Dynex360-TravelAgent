"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";

interface CustomerOpsStripData {
  at_risk_count: number;
  worst_status: string | null;
  open_recommendations_count: number;
  upcoming_departure: {
    booking_id: string;
    reference_number: string;
    travel_date: string;
  } | null;
}

interface Customer360OperationsStripProps {
  customerId: string;
}

export function Customer360OperationsStrip({ customerId }: Customer360OperationsStripProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<CustomerOpsStripData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/operations/customer-strip?customer_id=${customerId}`);
      const body = (await res.json()) as { data?: CustomerOpsStripData };
      setData(body.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!data || (data.at_risk_count === 0 && data.open_recommendations_count === 0 && !data.upcoming_departure)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("opsAi.stripTitle")}</CardTitle>
      </CardHeader>
      <div className="space-y-2 px-6 pb-6 text-sm">
        {data.worst_status && (
          <p>
            {t("opsAi.status")}:{" "}
            <span className="font-medium capitalize">{data.worst_status.replace(/_/g, " ")}</span>
          </p>
        )}
        {data.at_risk_count > 0 && (
          <p className="text-amber-700 dark:text-amber-400">
            {t("opsAi.atRiskBookings")}: {data.at_risk_count}
          </p>
        )}
        {data.open_recommendations_count > 0 && (
          <p>
            {t("opsAi.openRecommendations")}: {data.open_recommendations_count}
          </p>
        )}
        {data.upcoming_departure && (
          <p>
            {t("opsAi.nextDeparture")}:{" "}
            <Link
              href={`/bookings/show/${data.upcoming_departure.booking_id}`}
              className="text-primary hover:underline"
            >
              {data.upcoming_departure.reference_number}
            </Link>{" "}
            ({data.upcoming_departure.travel_date})
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          <Link href="/crm/operations-insights" className="underline">
            {t("opsAi.insightsLink")}
          </Link>
        </p>
      </div>
    </Card>
  );
}
