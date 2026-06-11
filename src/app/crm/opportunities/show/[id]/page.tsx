"use client";

import { useCan, useGetIdentity, useList, useShow } from "@refinedev/core";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmTimeline } from "@/components/crm/crm-timeline";
import { OpportunityQuickActions } from "@/components/crm/opportunity-quick-actions";
import { SalesAssistantPanel } from "@/components/sales-ai/SalesAssistantPanel";
import { useTranslation } from "@/i18n/locale-provider";
import type { Opportunity, Quotation, UserRole } from "@/types";

export default function OpportunityShowPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole; id?: string }>();
  const { queryResult } = useShow<Opportunity>({ resource: "opportunities" });
  const opportunity = queryResult?.data?.data;

  const { data: canEdit } = useCan({
    resource: "opportunities",
    action: "edit",
    params: { role: identity?.role },
  });

  const { data: quotationsData } = useList<Quotation>({
    resource: "quotations",
    filters: [
      { field: "opportunity_id", operator: "eq", value: opportunity?.id ?? "" },
      { field: "deleted_at", operator: "null", value: null },
    ],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 20 },
    queryOptions: { enabled: Boolean(opportunity?.id) },
  });
  const opportunityQuotations = quotationsData?.data ?? [];

  if (!opportunity) return <p>{t("common.loading")}</p>;

  const canWrite =
    canEdit?.can !== false &&
    (identity?.role === "tenant_admin" ||
      identity?.role === "super_admin" ||
      opportunity.owner_id === identity?.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">
          {opportunity.opportunity_number}
        </p>
        <h2 className="text-2xl font-bold">
          {opportunity.destination_text ?? opportunity.opportunity_number}
        </h2>
        <div className="mt-2">
          <StatusBadge namespace="opportunities.stage" value={opportunity.stage} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("opportunities.details")}</CardTitle>
          </CardHeader>
          <dl className="space-y-2 px-6 pb-6 text-sm">
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("opportunities.revenue")}:</dt>
              <dd>
                {opportunity.estimated_revenue != null
                  ? `${opportunity.estimated_revenue} ${opportunity.currency}`
                  : "—"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("opportunities.probability")}:</dt>
              <dd>{opportunity.probability ?? "—"}%</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("opportunities.pax")}:</dt>
              <dd>{opportunity.pax_count}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("opportunities.leadSource")}:</dt>
              <dd>
                {opportunity.lead_source ? (
                  <StatusBadge namespace="leads.source" value={opportunity.lead_source} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("opportunities.whatsapp")}:</dt>
              <dd>{opportunity.whatsapp ?? "—"}</dd>
            </div>
            {opportunity.customer_id && (
              <div className="flex gap-2">
                <dt className="w-40 font-medium">{t("nav.customers")}:</dt>
                <dd>
                  <Link
                    href={`/customers/show/${opportunity.customer_id}`}
                    className="text-primary underline"
                  >
                    {t("common.view")}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Card>
        <OpportunityQuickActions
          opportunity={opportunity}
          canWrite={canWrite}
          userRole={identity?.role}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("quotations.title")}</CardTitle>
          {canWrite && (
            <Link
              href={`/crm/quotations/create?opportunity_id=${opportunity.id}`}
              className="text-sm text-primary hover:underline"
            >
              {t("quotations.create")}
            </Link>
          )}
        </CardHeader>
        <div className="px-6 pb-6">
          {opportunityQuotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {opportunityQuotations.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/crm/quotations/show/${q.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {q.quotation_number}
                  </Link>
                  <StatusBadge namespace="quotations.status" value={q.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("activities.engagement")}</CardTitle>
        </CardHeader>
        <dl className="space-y-2 px-6 pb-6 text-sm">
          <div className="flex gap-2">
            <dt className="w-40 font-medium">{t("activities.count")}:</dt>
            <dd>{opportunity.activity_count ?? 0}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 font-medium">{t("activities.lastActivity")}:</dt>
            <dd>
              {opportunity.last_activity_at
                ? new Date(opportunity.last_activity_at).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <CrmTimeline
        opportunityId={opportunity.id}
        includeStageHistory
        canWrite={canWrite}
      />

      <SalesAssistantPanel
        entityType="opportunity"
        entityId={opportunity.id}
        customerId={opportunity.customer_id ?? undefined}
        opportunityId={opportunity.id}
      />
    </div>
  );
}
