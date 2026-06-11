"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity } from "@refinedev/core";
import { apiListActivities } from "@/lib/crm/activities-api-client";
import type { ActivityListView } from "@/lib/validation/activity";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { CrmActivity, UserRole } from "@/types";

const VIEWS: ActivityListView[] = ["timeline", "upcoming", "overdue", "my"];

export default function ActivitiesListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "activities",
    action: "create",
    params: { role: identity?.role },
  });

  const [view, setView] = useState<ActivityListView>("upcoming");
  const [items, setItems] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiListActivities({ view, limit: 100 });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("activities.title")}</h2>
        {canCreate?.can !== false && (
          <Link href="/crm/activities/create">
            <Button>{t("activities.create")}</Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={view === v ? "default" : "outline"}
            onClick={() => setView(v)}
          >
            {t(`activities.views.${v}`)}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">{t("activities.subject")}</th>
                <th className="px-4 py-3 text-left">{t("activities.typeLabel")}</th>
                <th className="px-4 py-3 text-left">{t("activities.directionLabel")}</th>
                <th className="px-4 py-3 text-left">{t("activities.statusLabel")}</th>
                <th className="px-4 py-3 text-left">{t("activities.due")}</th>
                <th className="px-4 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{a.subject}</td>
                  <td className="px-4 py-3">
                    <StatusBadge namespace="activities.type" value={a.activity_type} />
                  </td>
                  <td className="px-4 py-3">
                    {a.direction ? (
                      <StatusBadge
                        namespace="activities.direction"
                        value={a.direction}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge namespace="activities.status" value={a.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.due_date ? new Date(a.due_date).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/crm/activities/show/${a.id}`}
                      className="text-primary hover:underline"
                    >
                      {t("common.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
