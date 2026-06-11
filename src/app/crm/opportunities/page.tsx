"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiGetOpportunityForecast } from "@/lib/crm/opportunities-api-client";
import { useTranslation } from "@/i18n/locale-provider";
import type { Opportunity, OpportunityStage, UserRole } from "@/types";

export default function OpportunitiesListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "opportunities",
    action: "create",
    params: { role: identity?.role },
  });

  const [stageFilter, setStageFilter] = useState<OpportunityStage | "">("");
  const [forecastTotal, setForecastTotal] = useState<number | null>(null);
  const [forecastCurrency, setForecastCurrency] = useState("USD");

  useEffect(() => {
    apiGetOpportunityForecast("month")
      .then((f) => {
        setForecastTotal(f.total_weighted);
        setForecastCurrency(f.currency);
      })
      .catch(() => setForecastTotal(null));
  }, []);

  const filters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (stageFilter) {
      next.push({ field: "stage", operator: "eq", value: stageFilter });
    }
    return next;
  }, [stageFilter]);

  const { data, isLoading } = useList<Opportunity>({
    resource: "opportunities",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });

  const rows = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("opportunities.title")}</h2>
        {canCreate?.can !== false && (
          <Link href="/crm/opportunities/create">
            <Button>{t("opportunities.create")}</Button>
          </Link>
        )}
      </div>

      {forecastTotal != null && (
        <Card className="mb-4 p-4">
          <p className="text-sm text-muted-foreground">{t("opportunities.forecastTitle")}</p>
          <p className="text-xl font-semibold">
            {t("opportunities.forecastTotal")}: {forecastTotal.toLocaleString()} {forecastCurrency}
          </p>
        </Card>
      )}

      <Card className="mb-4 p-4">
        <Select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as OpportunityStage | "")}
        >
          <option value="">{t("opportunities.allStages")}</option>
          {(
            [
              "discovery",
              "proposal",
              "negotiation",
              "verbal_approval",
              "closed_won",
              "closed_lost",
            ] as OpportunityStage[]
          ).map((s) => (
            <option key={s} value={s}>
              {t(`opportunities.stage.${s}`)}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start">{t("opportunities.number")}</th>
                <th className="px-4 py-2 text-start">{t("opportunities.stageLabel")}</th>
                <th className="px-4 py-2 text-start">{t("opportunities.revenue")}</th>
                <th className="px-4 py-2 text-start">{t("opportunities.probability")}</th>
                <th className="px-4 py-2 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((opp) => (
                <tr key={opp.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{opp.opportunity_number}</td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="opportunities.stage" value={opp.stage} />
                  </td>
                  <td className="px-4 py-2">
                    {opp.estimated_revenue != null
                      ? `${opp.estimated_revenue} ${opp.currency}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{opp.probability ?? "—"}%</td>
                  <td className="px-4 py-2 text-end">
                    <Link href={`/crm/opportunities/show/${opp.id}`}>
                      <Button variant="outline" size="sm">
                        {t("common.view")}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
