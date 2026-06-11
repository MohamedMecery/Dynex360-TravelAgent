"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function StaffInboxLink() {
  const { t } = useTranslation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        setUnread(json.meta?.unread_count ?? 0);
      })
      .catch(() => undefined);
  }, []);

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      )}
      title={t("notifications.inbox.title")}
    >
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">{t("notifications.inbox.title")}</span>
      {unread > 0 ? (
        <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
