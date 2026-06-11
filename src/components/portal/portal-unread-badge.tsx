"use client";

import { useEffect, useState } from "react";

export function PortalUnreadBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/portal/notifications/unread-count")
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        setUnread(json.data?.unread_count ?? 0);
      })
      .catch(() => undefined);
  }, []);

  if (unread <= 0) return null;

  return (
    <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
