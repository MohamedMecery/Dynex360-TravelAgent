"use client";

import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";

type AuditAction = "INSERT" | "UPDATE" | "DELETE";

interface AuditLogRow {
  id: string;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  created_at: string;
  users?: { email?: string; first_name?: string; last_name?: string } | null;
}

function formatActor(user: AuditLogRow["users"]): string {
  if (!user) return "—";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormat();
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");

  const filters = useMemo(() => {
    const next: { field: string; operator: "eq"; value: string }[] = [];
    if (tableFilter.trim()) {
      next.push({ field: "table_name", operator: "eq", value: tableFilter.trim() });
    }
    if (actionFilter) {
      next.push({ field: "action", operator: "eq", value: actionFilter });
    }
    return next;
  }, [tableFilter, actionFilter]);

  const { data, isLoading } = useList<AuditLogRow>({
    resource: "audit_logs",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
    meta: { select: "id, action, table_name, record_id, created_at, users(email, first_name, last_name)" },
  });

  const logs = data?.data ?? [];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("auditLogs.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("auditLogs.subtitle")}</p>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("auditLogs.filterTable")}
            </label>
            <Input
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder={t("auditLogs.tablePlaceholder")}
            />
          </div>
          <div className="min-w-[10rem]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("auditLogs.filterAction")}
            </label>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
            >
              <option value="">{t("auditLogs.allActions")}</option>
              <option value="INSERT">{t("auditLogs.actions.insert")}</option>
              <option value="UPDATE">{t("auditLogs.actions.update")}</option>
              <option value="DELETE">{t("auditLogs.actions.delete")}</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("auditLogs.when")}</th>
                <th className="pb-2 pr-4">{t("auditLogs.who")}</th>
                <th className="pb-2 pr-4">{t("auditLogs.action")}</th>
                <th className="pb-2 pr-4">{t("auditLogs.entity")}</th>
                <th className="pb-2">{t("auditLogs.recordId")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="py-2 pr-4">{formatActor(row.users)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{row.action}</td>
                  <td className="py-2 pr-4">{row.table_name}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">
                    {row.record_id ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("auditLogs.empty")}
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
