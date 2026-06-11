"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useList } from "@refinedev/core";
import { OPPORTUNITY_BOOKING_STAGES } from "@/lib/auth/crm-rbac";
import { apiCreateBookingFromOpportunity } from "@/lib/crm/opportunities-api-client";
import type { Opportunity, Package, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";

interface OpportunityQuickActionsProps {
  opportunity: Opportunity;
  canWrite: boolean;
  userRole?: UserRole;
}

export function OpportunityQuickActions({
  opportunity,
  canWrite,
  userRole,
}: OpportunityQuickActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [packageId, setPackageId] = useState("");
  const [adminOverride, setAdminOverride] = useState(false);

  const { data: packagesData } = useList<Package>({
    resource: "packages",
    filters: [
      { field: "status", operator: "eq", value: "published" },
      { field: "deleted_at", operator: "null", value: null },
    ],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: canWrite },
  });
  const packages = packagesData?.data ?? [];

  const hasCustomer = Boolean(opportunity.customer_id);
  const stageAllowsBooking = OPPORTUNITY_BOOKING_STAGES.includes(
    opportunity.stage as (typeof OPPORTUNITY_BOOKING_STAGES)[number]
  );
  const canOverride = userRole === "tenant_admin";
  const canBook =
    hasCustomer &&
    (stageAllowsBooking || (canOverride && adminOverride));

  async function createBooking(mode: "custom" | "package") {
    if (!hasCustomer) {
      setMessage(t("opportunities.needsCustomer"));
      return;
    }
    if (!canBook) {
      setMessage(t("opportunities.bookingStageRequired"));
      return;
    }
    setBusy(mode);
    setMessage(null);
    try {
      const result = await apiCreateBookingFromOpportunity(
        opportunity.id,
        mode === "package"
          ? { package_id: packageId }
          : {
              line_items: [
                {
                  description: opportunity.destination_text
                    ? `Trip — ${opportunity.destination_text}`
                    : `Trip — ${opportunity.opportunity_number}`,
                  quantity: opportunity.pax_count,
                  unit_price:
                    opportunity.estimated_revenue != null
                      ? Number(opportunity.estimated_revenue) /
                        Math.max(opportunity.pax_count, 1)
                      : 0,
                },
              ],
            },
        canOverride && adminOverride && !stageAllowsBooking
          ? { admin_override: true }
          : undefined
      );
      router.push(result.redirect_url);
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "BOOKING_STAGE_NOT_ALLOWED") {
        setMessage(t("opportunities.bookingStageRequired"));
      } else {
        setMessage(err instanceof Error ? err.message : t("leads.actionError"));
      }
    } finally {
      setBusy(null);
    }
  }

  const showStageHint =
    canWrite && hasCustomer && !stageAllowsBooking && !(canOverride && adminOverride);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.quickActions")}</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2 px-6 pb-6">
        {canWrite && (
          <>
            {showStageHint && (
              <p className="text-sm text-muted-foreground">
                {t("opportunities.bookingStageRequired")}
              </p>
            )}
            {canOverride && !stageAllowsBooking && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={adminOverride}
                  onChange={(e) => setAdminOverride(e.target.checked)}
                />
                {t("opportunities.adminOverrideBooking")}
              </label>
            )}
            <Button
              type="button"
              variant="default"
              className="w-full"
              disabled={busy !== null || !canBook}
              onClick={() => createBooking("custom")}
            >
              {busy === "custom" ? t("common.saving") : t("opportunities.createBookingCustom")}
            </Button>
            <Select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full"
            >
              <option value="">{t("fields.selectPackage")}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy !== null || !canBook || !packageId}
              onClick={() => createBooking("package")}
            >
              {busy === "package" ? t("common.saving") : t("opportunities.createBookingPackage")}
            </Button>
          </>
        )}
        {opportunity.lead_id && (
          <Link href={`/crm/leads/show/${opportunity.lead_id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("leads.title")}
            </Button>
          </Link>
        )}
        {canWrite && (
          <Link
            href={`/crm/quotations/create?opportunity_id=${opportunity.id}`}
          >
            <Button type="button" variant="default" className="w-full">
              {t("quotations.createFromOpportunity")}
            </Button>
          </Link>
        )}
        {canWrite && (
          <Link href={`/crm/opportunities/edit/${opportunity.id}`}>
            <Button type="button" variant="outline" className="w-full">
              {t("common.edit")}
            </Button>
          </Link>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </Card>
  );
}
