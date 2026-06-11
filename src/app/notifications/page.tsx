"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";
import type { StaffNotificationRow } from "@/lib/notifications/staff-notifications-service";

export default function StaffNotificationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StaffNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setItems(json.data ?? []);
      setUnreadCount(json.meta?.unread_count ?? 0);
    } catch {
      setError(t("notifications.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (res.ok) void load();
  };

  const markAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (res.ok) void load();
  };

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("notifications.inbox.title")}</h1>
        {unreadCount > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
            {t("notifications.inbox.markAllRead")}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("notifications.inbox.empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`p-4 ${!n.is_read ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {n.priority === "high" ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        {t("notifications.inbox.highPriority")}
                      </span>
                    ) : null}
                  </div>
                  {n.message ? (
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.action_url ? (
                    <Link href={n.action_url} className="text-sm text-primary hover:underline">
                      {t("notifications.inbox.open")}
                    </Link>
                  ) : null}
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("notifications.inbox.markRead")}
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
