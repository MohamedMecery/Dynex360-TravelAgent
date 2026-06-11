"use client";

import { useState } from "react";
import { useCan, useGetIdentity } from "@refinedev/core";
import { SalesAssistantPanel } from "@/components/sales-ai/SalesAssistantPanel";
import { useTranslation } from "@/i18n/locale-provider";
import type { UserRole } from "@/types";

export default function SalesAgentPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canUse } = useCan({
    resource: "ai-sales",
    action: "use",
    params: { role: identity?.role },
  });

  const [entityId, setEntityId] = useState("");

  if (!canUse?.can) {
    return <p className="text-sm text-muted-foreground">{t("common.forbidden")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">{t("nav.salesAgent")}</h2>
      <p className="text-sm text-muted-foreground">{t("salesAi.askPlaceholder")}</p>
      <label className="block text-sm">
        Opportunity ID (optional context)
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="UUID"
        />
      </label>
      {entityId ? (
        <SalesAssistantPanel
          entityType="opportunity"
          entityId={entityId}
          opportunityId={entityId}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Open an opportunity or customer record for contextual assistance, or paste an opportunity ID above.
        </p>
      )}
    </div>
  );
}
