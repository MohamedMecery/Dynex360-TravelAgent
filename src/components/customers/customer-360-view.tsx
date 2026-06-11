"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGetCustomer360 } from "@/lib/crm/customer-360-api-client";
import type { Customer360Payload } from "@/lib/crm/customer-360-types";
import { Customer360Header } from "@/components/customers/customer-360-header";
import { Customer360Timeline } from "@/components/customers/customer-360-timeline";
import { CustomerAddressesEditor } from "@/components/customers/customer-addresses-editor";
import { CustomerContactsEditor } from "@/components/customers/customer-contacts-editor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { cn } from "@/lib/utils";
import { resolveActivityEventType } from "@/lib/crm/timeline-events";
import { GatewayPaymentsPanel } from "@/components/payments/gateway-payments-panel";
import { CustomerCommunicationSettings } from "@/components/whatsapp/customer-communication-settings";
import { WhatsAppMessageHistory } from "@/components/whatsapp/whatsapp-message-history";
import { WhatsAppSendPanel } from "@/components/whatsapp/whatsapp-send-panel";
import { SalesAssistantPanel } from "@/components/sales-ai/SalesAssistantPanel";
import { Customer360OperationsStrip } from "@/components/operations-ai/Customer360OperationsStrip";
import type { ReactNode } from "react";

const TAB_IDS = [
  "overview",
  "timeline",
  "opportunities",
  "activities",
  "bookings",
  "invoices",
  "payments",
  "tickets",
  "revenue",
] as const;

type TabId = (typeof TAB_IDS)[number];

interface Customer360ViewProps {
  customerId: string;
}

export function Customer360View({ customerId }: Customer360ViewProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId | null) ?? "overview";
  const [activeTab, setActiveTab] = useState<TabId>(
    TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : "overview"
  );
  const [payload, setPayload] = useState<Customer360Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetCustomer360(customerId);
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customer360.loadError"));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleTabs = useMemo(() => {
    if (!payload) return ["overview"] as TabId[];
    const tabs: TabId[] = ["overview", "timeline"];
    if (payload.meta.permissions.crm_opportunities) tabs.push("opportunities");
    if (payload.meta.permissions.crm_activities) tabs.push("activities");
    tabs.push("bookings", "invoices", "payments", "tickets");
    if (payload.meta.permissions.financial) tabs.push("revenue");
    return tabs;
  }, [payload]);

  const setTab = (tab: string) => {
    if (TAB_IDS.includes(tab as TabId)) {
      setActiveTab(tab as TabId);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (loading) return <p>{t("common.loading")}</p>;
  if (error || !payload) {
    return <p className="text-destructive">{error ?? t("customer360.loadError")}</p>;
  }

  const { customer, summary, tabs, timeline_preview, meta } = payload;

  return (
    <div className="space-y-6">
      <Customer360Header
        customer={customer}
        summary={summary}
        permissions={meta.permissions}
        onTabChange={setTab}
      />

      <nav className="flex flex-wrap gap-1 border-b border-border pb-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setTab(tab)}
          >
            {t(`customer360.tabs.${tab}`)}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("activities.timeline")}</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <Customer360Timeline
                customerId={customerId}
                preview={timeline_preview}
                previewOnly
                onViewFull={() => setTab("timeline")}
                canWriteActivity={meta.permissions.crm_write_activity}
              />
            </div>
          </Card>
          <SalesAssistantPanel
            entityType="customer"
            entityId={customerId}
            customerId={customerId}
          />
          <Customer360OperationsStrip customerId={customerId} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CustomerContactsEditor customerId={customerId} />
            <CustomerAddressesEditor customerId={customerId} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CustomerCommunicationSettings customerId={customerId} />
            <WhatsAppSendPanel customerId={customerId} />
          </div>
          <WhatsAppMessageHistory customerId={customerId} />
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t("common.notes")}</CardTitle>
              </CardHeader>
              <p className="px-6 pb-6 text-sm text-muted-foreground">{customer.notes}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("activities.timeline")}</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <Customer360Timeline
              customerId={customerId}
              canWriteActivity={meta.permissions.crm_write_activity}
            />
          </div>
        </Card>
      )}

      {activeTab === "opportunities" && meta.permissions.crm_opportunities && (
        <OpportunitiesTab opportunities={tabs.opportunities} />
      )}

      {activeTab === "activities" && meta.permissions.crm_activities && (
        <ActivitiesTab
          customerId={customerId}
          activities={tabs.activities}
          canWrite={meta.permissions.crm_write_activity}
        />
      )}

      {activeTab === "bookings" && <BookingsTab bookings={tabs.bookings} />}
      {activeTab === "invoices" && <InvoicesTab invoices={tabs.invoices} />}
      {activeTab === "payments" && (
        <PaymentsTab payments={tabs.payments} customerId={customerId} />
      )}
      {activeTab === "tickets" && <TicketsTab tickets={tabs.tickets} />}
      {activeTab === "revenue" && meta.permissions.financial && tabs.revenue && (
        <RevenueTab
          customerId={customerId}
          revenue={tabs.revenue}
          invoices={tabs.invoices}
          payments={tabs.payments}
        />
      )}
    </div>
  );
}

function OpportunitiesTab({
  opportunities,
}: {
  opportunities: Customer360Payload["tabs"]["opportunities"];
}) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customer360.tabs.opportunities")}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto px-6 pb-6">
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("customer360.noOpportunities")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("opportunities.number")}</th>
                <th className="pb-2 pr-4">{t("opportunities.stageLabel")}</th>
                <th className="pb-2 pr-4">{t("fields.destination")}</th>
                <th className="pb-2 pr-4">{t("opportunities.revenue")}</th>
                <th className="pb-2 pr-4">{t("opportunities.probability")}</th>
                <th className="pb-2">{t("opportunities.closeDate")}</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/crm/opportunities/show/${o.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {o.opportunity_number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge namespace="opportunities.stage" value={o.stage} />
                  </td>
                  <td className="py-2 pr-4">{o.destination_text ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {o.estimated_revenue != null
                      ? formatCurrency(Number(o.estimated_revenue), o.currency)
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {o.probability != null ? `${o.probability}%` : "—"}
                  </td>
                  <td className="py-2">
                    {o.expected_close_date
                      ? formatDate(o.expected_close_date)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function ActivitiesTab({
  customerId,
  activities,
  canWrite,
}: {
  customerId: string;
  activities: Customer360Payload["tabs"]["activities"];
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("customer360.tabs.activities")}</CardTitle>
        {canWrite && (
          <Link href={`/crm/activities/create?customer_id=${customerId}`}>
            <Button size="sm">{t("activities.logActivity")}</Button>
          </Link>
        )}
      </CardHeader>
      <div className="overflow-x-auto px-6 pb-6">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("activities.noTimeline")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("activities.subject")}</th>
                <th className="pb-2 pr-4">{t("activities.typeLabel")}</th>
                <th className="pb-2 pr-4">{t("activities.directionLabel")}</th>
                <th className="pb-2 pr-4">{t("activities.statusLabel")}</th>
                <th className="pb-2 pr-4">{t("activities.due")}</th>
                <th className="pb-2">{t("activities.eventTypeLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const eventType = resolveActivityEventType(
                  a.activity_type,
                  a.direction
                );
                return (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/crm/activities/show/${a.id}`}
                        className="text-primary hover:underline"
                      >
                        {a.subject}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge namespace="activities.type" value={a.activity_type} />
                    </td>
                    <td className="py-2 pr-4">
                      {a.direction ? (
                        <StatusBadge namespace="activities.direction" value={a.direction} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge namespace="activities.status" value={a.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {a.due_date ? formatDate(a.due_date) : "—"}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {eventType}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function BookingsTab({
  bookings,
}: {
  bookings: Customer360Payload["tabs"]["bookings"];
}) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();

  return (
    <DataTableCard title={t("customer360.tabs.bookings")} empty={t("customers.noBookings")} rows={bookings}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4">{t("dashboard.reference")}</th>
            <th className="pb-2 pr-4">{t("fields.package")}</th>
            <th className="pb-2 pr-4">{t("fields.status")}</th>
            <th className="pb-2 pr-4">{t("fields.travelDate")}</th>
            <th className="pb-2">{t("bookings.total")}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  href={`/bookings/show/${b.id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {b.reference_number}
                </Link>
              </td>
              <td className="py-2 pr-4">{b.package_title ?? "—"}</td>
              <td className="py-2 pr-4">
                <StatusBadge namespace="bookingStatus" value={b.status} />
              </td>
              <td className="py-2 pr-4">
                {b.travel_date ? formatDate(b.travel_date) : "—"}
              </td>
              <td className="py-2">{formatCurrency(b.total_amount, b.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableCard>
  );
}

function InvoicesTab({
  invoices,
}: {
  invoices: Customer360Payload["tabs"]["invoices"];
}) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();

  return (
    <DataTableCard title={t("customer360.tabs.invoices")} empty={t("customer360.noInvoices")} rows={invoices}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4">{t("fields.invoiceNumber")}</th>
            <th className="pb-2 pr-4">{t("dashboard.reference")}</th>
            <th className="pb-2 pr-4">{t("fields.status")}</th>
            <th className="pb-2 pr-4">{t("bookings.total")}</th>
            <th className="pb-2">{t("fields.dueDate")}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  href={`/invoices/show/${inv.id}`}
                  className="text-primary hover:underline"
                >
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="py-2 pr-4 font-mono text-xs">
                {inv.booking_reference ?? "—"}
              </td>
              <td className="py-2 pr-4">
                <StatusBadge namespace="invoiceStatus" value={inv.status} />
              </td>
              <td className="py-2 pr-4">
                {formatCurrency(inv.total_amount, inv.currency)}
              </td>
              <td className="py-2">
                {inv.due_date ? formatDate(inv.due_date) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableCard>
  );
}

function PaymentsTab({
  payments,
  customerId,
}: {
  payments: Customer360Payload["tabs"]["payments"];
  customerId: string;
}) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();

  return (
    <div className="space-y-6">
    <GatewayPaymentsPanel fetchUrl={`/api/customers/${customerId}/gateway-payments`} />
    <DataTableCard title={t("customer360.tabs.payments")} empty={t("customer360.noPayments")} rows={payments}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4">{t("fields.referenceNumber")}</th>
            <th className="pb-2 pr-4">{t("bookings.total")}</th>
            <th className="pb-2 pr-4">{t("fields.method")}</th>
            <th className="pb-2">{t("fields.paymentDate")}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  href={`/payments/show/${p.id}`}
                  className="text-primary hover:underline"
                >
                  {p.reference_number ?? p.id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-2 pr-4">{formatCurrency(p.amount)}</td>
              <td className="py-2 pr-4">{p.method}</td>
              <td className="py-2">{formatDate(p.payment_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableCard>
    </div>
  );
}

function TicketsTab({
  tickets,
}: {
  tickets: Customer360Payload["tabs"]["tickets"];
}) {
  const { t } = useTranslation();

  return (
    <DataTableCard title={t("customer360.tabs.tickets")} empty={t("customer360.noTickets")} rows={tickets}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">{t("supportTickets.subject")}</th>
            <th className="pb-2 pr-4">{t("supportTickets.status")}</th>
            <th className="pb-2">{t("supportTickets.priority")}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((tk) => (
            <tr key={tk.id} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  href={`/ai/support/tickets/show/${tk.id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {tk.ticket_number}
                </Link>
              </td>
              <td className="py-2 pr-4">{tk.subject}</td>
              <td className="py-2 pr-4">{tk.status}</td>
              <td className="py-2">{tk.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableCard>
  );
}

function RevenueTab({
  customerId,
  revenue,
  invoices,
  payments,
}: {
  customerId: string;
  revenue: NonNullable<Customer360Payload["tabs"]["revenue"]>;
  invoices: Customer360Payload["tabs"]["invoices"];
  payments: Customer360Payload["tabs"]["payments"];
}) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormat();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("customer360.kpi.lifetimeValue")}</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(revenue.lifetime_customer_value, revenue.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("customer360.revenue.ytd")}</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(revenue.ytd_revenue, revenue.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("customer360.kpi.outstanding")}</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(revenue.outstanding_balance, revenue.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("customer360.revenue.avgBooking")}</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(revenue.avg_booking_value, revenue.currency)}
          </p>
        </Card>
      </div>
      <InvoicesTab invoices={invoices} />
      <PaymentsTab payments={payments} customerId={customerId} />
    </div>
  );
}

function DataTableCard({
  title,
  empty,
  rows,
  children,
}: {
  title: string;
  empty: string;
  rows: unknown[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto px-6 pb-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
