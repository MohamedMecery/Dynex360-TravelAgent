"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { Quotation, QuotationStatus, UserRole } from "@/types";

const STATUSES: QuotationStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "converted_to_booking",
];

export default function QuotationsListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "quotations",
    action: "create",
    params: { role: identity?.role },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "">("");

  const filters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (statusFilter) {
      next.push({ field: "status", operator: "eq", value: statusFilter });
    }
    if (search.trim()) {
      next.push({
        field: "quotation_number",
        operator: "contains",
        value: search.trim(),
      });
    }
    return next;
  }, [search, statusFilter]);

  const { data, isLoading } = useList<Quotation>({
    resource: "quotations",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });

  const quotations = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("quotations.title")}</h2>
        {canCreate?.can !== false && (
          <Link href="/crm/quotations/create">
            <Button>{t("quotations.create")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder={t("quotations.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | "")}
          >
            <option value="">{t("quotations.allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`quotations.status.${s}`)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : quotations.length === 0 ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left">{t("quotations.number")}</th>
                <th className="px-4 py-2 text-left">{t("quotations.statusLabel")}</th>
                <th className="px-4 py-2 text-right">{t("quotations.total")}</th>
                <th className="px-4 py-2 text-left">{t("quotations.validUntil")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{q.quotation_number}</td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="quotations.status" value={q.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(q.total_amount).toLocaleString()} {q.currency}
                  </td>
                  <td className="px-4 py-2">{q.valid_until ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/crm/quotations/show/${q.id}`}
                      className="text-primary hover:underline"
                    >
                      {t("common.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
