"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { AiAgentKey, AiConversation, UserRole } from "@/types";

const AGENT_ROUTES: Record<AiAgentKey, string> = {
  knowledge: "/ai/knowledge",
  booking: "/ai/booking",
  support: "/ai/support",
};

function isTenantWideAiViewer(role: UserRole | undefined): boolean {
  return role === "tenant_admin" || role === "super_admin";
}

export default function AiConversationHistoryPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormat();
  const { data: identity } = useGetIdentity<{ id?: string; role?: UserRole }>();

  const filters = useMemo((): CrudFilters => {
    if (!identity?.id || isTenantWideAiViewer(identity.role)) {
      return [];
    }
    return [{ field: "user_id", operator: "eq", value: identity.id }];
  }, [identity?.id, identity?.role]);

  const { data, isLoading } = useList<AiConversation>({
    resource: "ai_conversations",
    filters,
    sorters: [{ field: "updated_at", order: "desc" }],
    pagination: { pageSize: 50 },
    meta: { select: "id, agent_key, title, created_at, updated_at, users(email, first_name, last_name)" },
  });

  const conversations = data?.data ?? [];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("aiHistory.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("aiHistory.subtitle")}</p>

      <Card className="overflow-x-auto p-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("aiHistory.agent")}</th>
                <th className="pb-2 pr-4">{t("aiHistory.topic")}</th>
                {isTenantWideAiViewer(identity?.role) && (
                  <th className="pb-2 pr-4">{t("aiHistory.user")}</th>
                )}
                <th className="pb-2 pr-4">{t("aiHistory.updated")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((row) => {
                const user = row.users;
                const userLabel =
                  [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
                  user?.email ||
                  "—";
                const agentRoute = AGENT_ROUTES[row.agent_key];
                const href = `${agentRoute}?conversation_id=${row.id}`;

                return (
                  <tr key={row.id} className="border-b">
                    <td className="py-2 pr-4">
                      <Badge variant="secondary">{t(`aiHistory.agents.${row.agent_key}`)}</Badge>
                    </td>
                    <td className="py-2 pr-4 max-w-xs truncate">
                      {row.title?.trim() || t("aiHistory.untitled")}
                    </td>
                    {isTenantWideAiViewer(identity?.role) && (
                      <td className="py-2 pr-4">{userLabel}</td>
                    )}
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatDateTime(row.updated_at)}
                    </td>
                    <td className="py-2">
                      <Link href={href} className="text-sm text-primary hover:underline">
                        {t("aiHistory.open")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {conversations.length === 0 && (
                <tr>
                  <td
                    colSpan={isTenantWideAiViewer(identity?.role) ? 5 : 4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("aiHistory.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
