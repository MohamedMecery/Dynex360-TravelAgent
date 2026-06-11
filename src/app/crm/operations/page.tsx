"use client";

import { useCan, useGetIdentity } from "@refinedev/core";
import { OperationsDashboardView } from "@/components/crm/operations-dashboard";
import { useTranslation } from "@/i18n/locale-provider";
import type { UserRole } from "@/types";

export default function CrmOperationsPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canAccess } = useCan({
    resource: "crm-operations",
    action: "list",
    params: { role: identity?.role },
  });

  if (canAccess?.can === false) {
    return (
      <p className="text-muted-foreground">{t("operations.forbidden")}</p>
    );
  }

  return <OperationsDashboardView />;
}
