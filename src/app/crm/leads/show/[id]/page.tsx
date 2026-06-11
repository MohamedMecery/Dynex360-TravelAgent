"use client";

import { useCallback, useEffect, useState } from "react";
import { useCan, useGetIdentity, useShow } from "@refinedev/core";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmTimeline } from "@/components/crm/crm-timeline";
import { LeadHealthWidget } from "@/components/crm/lead-health-widget";
import { LeadQuickActions } from "@/components/crm/lead-quick-actions";
import { SalesAssistantPanel } from "@/components/sales-ai/SalesAssistantPanel";
import { withAuditUserSelect } from "@/lib/audit/record-metadata";
import { RecordMetadata } from "@/components/shared/record-metadata";
import { useTranslation } from "@/i18n/locale-provider";
import type { Lead, UserRole } from "@/types";

interface TenantUser {
  id: string;
  full_name: string | null;
  email: string;
}

export default function LeadShowPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole; id?: string }>();
  const { queryResult } = useShow<Lead>({
    resource: "leads",
    meta: { select: withAuditUserSelect("leads", "*") },
  });
  const lead = queryResult?.data?.data;
  const refetch = queryResult?.refetch;

  const { data: canEdit } = useCan({
    resource: "leads",
    action: "edit",
    params: { role: identity?.role },
  });

  const [users, setUsers] = useState<TenantUser[]>([]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      if (!res.ok) return;
      const body = (await res.json()) as { data?: TenantUser[] };
      setUsers(body.data ?? []);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!lead) return <p>{t("common.loading")}</p>;

  const canWrite =
    canEdit?.can !== false &&
    (identity?.role === "tenant_admin" ||
      identity?.role === "super_admin" ||
      lead.owner_id === identity?.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{lead.lead_number}</p>
        <h2 className="text-2xl font-bold">{lead.full_name}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge namespace="leads.status" value={lead.status} />
          <StatusBadge namespace="leads.source" value={lead.source} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("leads.details")}</CardTitle>
            </CardHeader>
            <dl className="space-y-2 px-6 pb-6 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 font-medium">{t("fields.email")}:</dt>
                <dd>{lead.email ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 font-medium">{t("fields.mobile")}:</dt>
                <dd>{lead.mobile ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 font-medium">WhatsApp:</dt>
                <dd>{lead.whatsapp ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 font-medium">{t("leads.destination")}:</dt>
                <dd>{lead.destination_text ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 font-medium">{t("leads.budget")}:</dt>
                <dd>
                  {lead.expected_budget != null
                    ? `${lead.expected_budget} ${lead.currency ?? ""}`
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 font-medium">{t("leads.lastContact")}:</dt>
                <dd>
                  {lead.last_contacted_at
                    ? new Date(lead.last_contacted_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
              {lead.notes && (
                <div>
                  <dt className="mb-1 font-medium">{t("common.notes")}:</dt>
                  <dd className="text-muted-foreground">{lead.notes}</dd>
                </div>
              )}
            </dl>
            <div className="px-6 pb-6">
              <RecordMetadata {...lead} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <LeadQuickActions
            lead={lead}
            canWrite={canWrite}
            users={users}
            onRefresh={() => void refetch?.()}
          />
          <LeadHealthWidget leadId={lead.id} />
          {(lead.activity_count != null || lead.last_activity_at) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("activities.engagement")}</CardTitle>
              </CardHeader>
              <dl className="space-y-2 px-6 pb-6 text-sm">
                <div className="flex gap-2">
                  <dt className="w-36 font-medium">{t("activities.count")}:</dt>
                  <dd>{lead.activity_count ?? 0}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-36 font-medium">{t("activities.lastActivity")}:</dt>
                  <dd>
                    {lead.last_activity_at
                      ? new Date(lead.last_activity_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      </div>

      <CrmTimeline leadId={lead.id} canWrite={canWrite} />

      <SalesAssistantPanel entityType="lead" entityId={lead.id} />
    </div>
  );
}
