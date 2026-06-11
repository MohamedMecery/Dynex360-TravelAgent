"use client";

import { useEffect, useState } from "react";
import { apiGetLeadHealth } from "@/lib/crm/leads-api-client";
import type { LeadHealthResult } from "@/lib/crm/lead-health";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface LeadHealthWidgetProps {
  leadId: string;
}

const levelStyles: Record<LeadHealthResult["level"], string> = {
  healthy: "bg-emerald-100 text-emerald-900 border-emerald-200",
  needs_follow_up: "bg-amber-100 text-amber-900 border-amber-200",
  critical: "bg-red-100 text-red-900 border-red-200",
};

export function LeadHealthWidget({ leadId }: LeadHealthWidgetProps) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<LeadHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetLeadHealth(leadId)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("leads.healthLoadError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.healthTitle")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {!health && !error && <p className="text-muted-foreground">{t("common.loading")}</p>}
        {health && (
          <div className="space-y-3">
            <div
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase",
                levelStyles[health.level]
              )}
            >
              {t(`leads.health.${health.level}`)} · {health.score}%
            </div>
            <p className="text-muted-foreground">
              {health.days_since_contact === null
                ? t("leads.healthNeverContacted")
                : t("leads.healthDaysSince").replace(
                    "{days}",
                    String(health.days_since_contact)
                  )}
            </p>
            {health.factors.length > 0 && (
              <ul className="list-inside list-disc text-muted-foreground">
                {health.factors.map((f) => {
                  const key = `leads.healthFactor.${f}`;
                  const label = t(key);
                  return <li key={f}>{label === key ? f : label}</li>;
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
