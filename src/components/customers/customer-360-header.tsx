"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Customer360Payload } from "@/lib/crm/customer-360-types";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { Customer } from "@/types";

interface Customer360HeaderProps {
  customer: Customer;
  summary: Customer360Payload["summary"];
  permissions: Customer360Payload["meta"]["permissions"];
  onTabChange: (tab: string) => void;
}

export function Customer360Header({
  customer,
  summary,
  permissions,
  onTabChange,
}: Customer360HeaderProps) {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useFormat();

  const sinceDate = formatDateTime(customer.created_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{getCustomerDisplayName(customer)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge namespace="customerType" value={customer.type} />
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("activities.count")}: {summary.activity_count}
            {" · "}
            {summary.last_activity_at
              ? `${t("activities.lastActivity")}: ${formatDateTime(summary.last_activity_at)}`
              : t("activities.noTimeline")}
            {" · "}
            {t("customer360.customerSince")} {sinceDate}
          </p>
        </div>
        <Link href={`/customers/edit/${customer.id}`}>
          <Button>{t("common.edit")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("customer360.kpi.bookings")}
          value={String(summary.booking_count)}
          subtitle={`${t("customer360.kpi.confirmed")}: ${summary.confirmed_booking_count}`}
          onClick={() => onTabChange("bookings")}
        />
        {permissions.crm_opportunities && (
          <KpiCard
            title={t("customer360.kpi.openOpportunities")}
            value={String(summary.open_opportunity_count)}
            subtitle={
              summary.weighted_pipeline != null
                ? formatCurrency(summary.weighted_pipeline, summary.currency)
                : undefined
            }
            onClick={() => onTabChange("opportunities")}
          />
        )}
        {permissions.financial && summary.lifetime_customer_value != null && (
          <KpiCard
            title={t("customer360.kpi.lifetimeValue")}
            value={formatCurrency(summary.lifetime_customer_value, summary.currency)}
            subtitle={t("customer360.kpi.lcvHint")}
            onClick={() => onTabChange("revenue")}
          />
        )}
        {permissions.financial && summary.outstanding_balance != null && (
          <KpiCard
            title={t("customer360.kpi.outstanding")}
            value={formatCurrency(summary.outstanding_balance, summary.currency)}
            onClick={() => onTabChange("revenue")}
          />
        )}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer transition-colors hover:bg-muted/40" : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
