"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCan } from "@refinedev/core";
import {
  apiAcceptQuotation,
  apiApproveQuotation,
  apiConvertQuotationToBooking,
  apiMarkQuotationViewed,
  apiRejectQuotation,
  apiRejectQuotationApproval,
  apiSendQuotation,
  apiSubmitQuotationApproval,
} from "@/lib/crm/quotations-api-client";
import type { Quotation, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";

interface QuotationWorkflowActionsProps {
  quotation: Quotation;
  userRole?: UserRole;
  onUpdated: (q: Quotation) => void;
}

export function QuotationWorkflowActions({
  quotation,
  userRole,
  onUpdated,
}: QuotationWorkflowActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: canSend } = useCan({
    resource: "quotations",
    action: "send",
    params: { role: userRole },
  });
  const { data: canApprove } = useCan({
    resource: "quotations",
    action: "approve",
    params: { role: userRole },
  });
  const { data: canAccept } = useCan({
    resource: "quotations",
    action: "accept",
    params: { role: userRole },
  });
  const { data: canConvert } = useCan({
    resource: "quotations",
    action: "convert",
    params: { role: userRole },
  });
  const { data: canEdit } = useCan({
    resource: "quotations",
    action: "edit",
    params: { role: userRole },
  });

  async function run(
    key: string,
    fn: () => Promise<Quotation | { quotation: Quotation; redirect_url: string }>
  ): Promise<void> {
    setBusy(key);
    setMessage(null);
    try {
      const result = await fn();
      if ("redirect_url" in result) {
        router.push(result.redirect_url);
        return;
      }
      onUpdated(result);
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "CUSTOMER_REQUIRED") {
        setMessage(t("quotations.customerRequired"));
      } else if (code === "ALREADY_CONVERTED") {
        setMessage(t("quotations.alreadyConverted"));
      } else {
        setMessage(err instanceof Error ? err.message : t("leads.actionError"));
      }
    } finally {
      setBusy(null);
    }
  }

  const status = quotation.status;
  const showEdit =
    canEdit?.can !== false &&
    (status === "draft" || status === "pending_approval");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.quickActions")}</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2 px-6 pb-6">
        {showEdit && (
          <Link href={`/crm/quotations/edit/${quotation.id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("common.edit")}
            </Button>
          </Link>
        )}

        {status === "draft" && canSend?.can !== false && (
          <>
            <Button
              type="button"
              className="w-full"
              disabled={busy !== null}
              onClick={() => run("send", () => apiSendQuotation(quotation.id))}
            >
              {busy === "send" ? t("common.saving") : t("quotations.send")}
            </Button>
            {canApprove?.can !== false && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy !== null}
                onClick={() =>
                  run("submit", () => apiSubmitQuotationApproval(quotation.id))
                }
              >
                {busy === "submit"
                  ? t("common.saving")
                  : t("quotations.submitApproval")}
              </Button>
            )}
          </>
        )}

        {status === "pending_approval" && canApprove?.can !== false && (
          <>
            <Button
              type="button"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                run("approve", () => apiApproveQuotation(quotation.id))
              }
            >
              {busy === "approve" ? t("common.saving") : t("quotations.approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                run("rejectApproval", () =>
                  apiRejectQuotationApproval(quotation.id)
                )
              }
            >
              {busy === "rejectApproval"
                ? t("common.saving")
                : t("quotations.rejectApproval")}
            </Button>
          </>
        )}

        {status === "approved" && canSend?.can !== false && (
          <Button
            type="button"
            className="w-full"
            disabled={busy !== null}
            onClick={() => run("send", () => apiSendQuotation(quotation.id))}
          >
            {busy === "send" ? t("common.saving") : t("quotations.send")}
          </Button>
        )}

        {(status === "sent" || status === "viewed") && (
          <>
            {status === "sent" && canEdit?.can !== false && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy !== null}
                onClick={() =>
                  run("viewed", () => apiMarkQuotationViewed(quotation.id))
                }
              >
                {busy === "viewed" ? t("common.saving") : t("quotations.markViewed")}
              </Button>
            )}
            {canAccept?.can !== false && (
              <Button
                type="button"
                className="w-full"
                disabled={busy !== null}
                onClick={() =>
                  run("accept", () => apiAcceptQuotation(quotation.id))
                }
              >
                {busy === "accept" ? t("common.saving") : t("quotations.accept")}
              </Button>
            )}
            {canEdit?.can !== false && (
              <>
                <Input
                  placeholder={t("quotations.rejectReason")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy !== null}
                  onClick={() =>
                    run("reject", () =>
                      apiRejectQuotation(quotation.id, rejectReason || undefined)
                    )
                  }
                >
                  {busy === "reject" ? t("common.saving") : t("quotations.reject")}
                </Button>
              </>
            )}
          </>
        )}

        {status === "accepted" && canConvert?.can !== false && (
          <Button
            type="button"
            className="w-full"
            disabled={busy !== null}
            onClick={() =>
              run("convert", async () => {
                const result = await apiConvertQuotationToBooking(quotation.id);
                return {
                  quotation: result.quotation,
                  redirect_url: result.redirect_url,
                };
              })
            }
          >
            {busy === "convert" ? t("common.saving") : t("quotations.convert")}
          </Button>
        )}

        {quotation.booking_id && (
          <Link href={`/bookings/show/${quotation.booking_id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("quotations.viewBooking")}
            </Button>
          </Link>
        )}

        {quotation.opportunity_id && (
          <Link href={`/crm/opportunities/show/${quotation.opportunity_id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("nav.opportunities")}
            </Button>
          </Link>
        )}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </Card>
  );
}
