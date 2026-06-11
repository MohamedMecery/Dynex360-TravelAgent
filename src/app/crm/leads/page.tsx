"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity, useList, type CrudFilters } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { Lead, LeadSource, LeadStatus, UserRole } from "@/types";

export default function LeadsListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "leads",
    action: "create",
    params: { role: identity?.role },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");

  const filters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (statusFilter) {
      next.push({ field: "status", operator: "eq", value: statusFilter });
    }
    if (sourceFilter) {
      next.push({ field: "source", operator: "eq", value: sourceFilter });
    }
    if (search.trim()) {
      next.push({
        operator: "or",
        value: [
          { field: "full_name", operator: "contains", value: search.trim() },
          { field: "email", operator: "contains", value: search.trim() },
          { field: "mobile", operator: "contains", value: search.trim() },
          { field: "whatsapp", operator: "contains", value: search.trim() },
          { field: "lead_number", operator: "contains", value: search.trim() },
        ],
      });
    }
    return next;
  }, [search, statusFilter, sourceFilter]);

  const { data, isLoading } = useList<Lead>({
    resource: "leads",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });

  const leads = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("leads.title")}</h2>
        {canCreate?.can !== false && (
          <Link href="/crm/leads/create">
            <Button>{t("leads.create")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder={t("leads.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
          >
            <option value="">{t("leads.allStatuses")}</option>
            {(
              [
                "new",
                "contacted",
                "qualified",
                "proposal_sent",
                "negotiation",
                "won",
                "lost",
              ] as LeadStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {t(`leads.status.${s}`)}
              </option>
            ))}
          </Select>
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")}
          >
            <option value="">{t("leads.allSources")}</option>
            {(
              [
                "whatsapp",
                "website",
                "facebook",
                "instagram",
                "tiktok",
                "referral",
                "walk_in",
                "phone_call",
                "other",
              ] as LeadSource[]
            ).map((s) => (
              <option key={s} value={s}>
                {t(`leads.source.${s}`)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : leads.length === 0 ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start">{t("leads.number")}</th>
                <th className="px-4 py-2 text-start">{t("leads.name")}</th>
                <th className="px-4 py-2 text-start">{t("leads.sourceLabel")}</th>
                <th className="px-4 py-2 text-start">{t("leads.statusLabel")}</th>
                <th className="px-4 py-2 text-start">{t("leads.lastContact")}</th>
                <th className="px-4 py-2 text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{lead.lead_number}</td>
                  <td className="px-4 py-2">{lead.full_name}</td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="leads.source" value={lead.source} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="leads.status" value={lead.status} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-end">
                    <Link href={`/crm/leads/show/${lead.id}`}>
                      <Button variant="outline" size="sm">
                        {t("common.view")}
                      </Button>
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
