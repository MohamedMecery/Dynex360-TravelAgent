"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGetIdentity } from "@refinedev/core";
import { apiGetQuotation } from "@/lib/crm/quotations-api-client";
import { QuotationWorkflowActions } from "@/components/crm/quotation-workflow-actions";
import { GatewayPaymentsPanel } from "@/components/payments/gateway-payments-panel";
import { WhatsAppSendPanel } from "@/components/whatsapp/whatsapp-send-panel";
import { WhatsAppMessageHistory } from "@/components/whatsapp/whatsapp-message-history";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { Quotation, UserRole } from "@/types";

export default function QuotationShowPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = String(params.id);
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuotation(await apiGetQuotation(id));
    } catch {
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p>{t("common.loading")}</p>;
  if (!quotation) return <p>{t("quotations.notFound")}</p>;

  const items = quotation.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">
          {quotation.quotation_number}
        </p>
        <h2 className="text-2xl font-bold">{t("quotations.title")}</h2>
        <div className="mt-2">
          <StatusBadge namespace="quotations.status" value={quotation.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("quotations.details")}</CardTitle>
          </CardHeader>
          <dl className="space-y-2 px-6 pb-6 text-sm">
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("quotations.total")}:</dt>
              <dd>
                {Number(quotation.total_amount).toLocaleString()} {quotation.currency}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("quotations.subtotal")}:</dt>
              <dd>
                {Number(quotation.subtotal).toLocaleString()} {quotation.currency}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 font-medium">{t("quotations.validUntil")}:</dt>
              <dd>{quotation.valid_until ?? "—"}</dd>
            </div>
            {quotation.notes && (
              <div className="flex gap-2">
                <dt className="w-40 font-medium">{t("common.notes")}:</dt>
                <dd>{quotation.notes}</dd>
              </div>
            )}
            {quotation.rejection_reason && (
              <div className="flex gap-2">
                <dt className="w-40 font-medium">{t("quotations.rejectReason")}:</dt>
                <dd>{quotation.rejection_reason}</dd>
              </div>
            )}
          </dl>

          <div className="border-t px-6 pb-6">
            <p className="mb-3 font-medium">{t("quotations.lineItems")}</p>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2">{t("quotations.description")}</th>
                    <th className="pb-2">{t("quotations.qty")}</th>
                    <th className="pb-2 text-right">{t("quotations.lineTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">
                        <span className="text-xs text-muted-foreground">
                          {t(`quotations.itemType.${item.item_type}`)}
                        </span>
                        <br />
                        {item.description}
                      </td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2 text-right">
                        {Number(item.line_total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <QuotationWorkflowActions
          quotation={quotation}
          userRole={identity?.role}
          onUpdated={setQuotation}
        />

        <GatewayPaymentsPanel fetchUrl={`/api/quotations/${id}/gateway-payments`} />

        {quotation.customer_id && (
          <>
            <WhatsAppSendPanel
              customerId={quotation.customer_id}
              quotationId={id}
            />
            <WhatsAppMessageHistory quotationId={id} />
          </>
        )}
      </div>
    </div>
  );
}
