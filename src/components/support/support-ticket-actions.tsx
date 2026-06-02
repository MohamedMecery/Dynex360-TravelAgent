"use client";

import { useState } from "react";
import { useList } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { SupportTicket, SupportTicketStatus } from "@/types";
import { TenantUserListItem } from "@/lib/users/types";

interface SupportTicketActionsProps {
  ticket: SupportTicket;
  onUpdated?: () => void;
}

export function SupportTicketActions({ ticket, onUpdated }: SupportTicketActionsProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [assigneeId, setAssigneeId] = useState(ticket.assigned_user_id ?? "");
  const [loading, setLoading] = useState(false);

  const { data: usersData } = useList<TenantUserListItem>({
    resource: "users",
    pagination: { pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "active" }],
  });

  const patchTicket = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("supportTickets.actionError"));
      }

      success(t("supportTickets.actionSuccess"));
      onUpdated?.();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("supportTickets.actionError"));
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (status: SupportTicketStatus) => {
    void patchTicket({ status });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="min-w-[180px] flex-1">
        <Label>{t("supportTickets.assignTo")}</Label>
        <Select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          disabled={loading}
        >
          <option value="">{t("supportTickets.unassigned")}</option>
          {(usersData?.data ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name ?? user.email}
            </option>
          ))}
        </Select>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void patchTicket({ assigned_user_id: assigneeId || null })}
      >
        {t("supportTickets.saveAssignee")}
      </Button>
      {ticket.status !== "escalated" && ticket.status !== "closed" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => void patchTicket({ escalate: true })}>
          {t("supportTickets.escalate")}
        </Button>
      )}
      {ticket.status !== "resolved" && ticket.status !== "closed" && (
        <Button size="sm" disabled={loading} onClick={() => setStatus("resolved")}>
          {t("supportTickets.resolve")}
        </Button>
      )}
      {ticket.status !== "closed" && (
        <Button size="sm" variant="ghost" disabled={loading} onClick={() => setStatus("closed")}>
          {t("supportTickets.close")}
        </Button>
      )}
    </div>
  );
}
