"use client";

import Link from "next/link";
import { useList } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { SupportTicket } from "@/types";

export default function SupportTicketsPage() {
  const { t, dir, isRtl } = useTranslation();
  const backArrow = isRtl ? "→" : "←";
  const { formatDate } = useFormat();
  const { data, isLoading } = useList<SupportTicket>({
    resource: "support_tickets",
    pagination: { pageSize: 50 },
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const tickets = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/ai/support" className="text-sm text-muted-foreground hover:underline">
            {backArrow} {t("supportAgent.title")}
          </Link>
          <h2 className="mt-2 text-2xl font-bold">{t("supportTickets.title")}</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("supportTickets.listTitle")}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm" dir={dir}>
            <thead>
              <tr className="border-b text-start">
                <th className="px-4 pb-2">{t("supportTickets.number")}</th>
                <th className="px-4 pb-2">{t("supportTickets.subject")}</th>
                <th className="px-4 pb-2">{t("supportTickets.status")}</th>
                <th className="px-4 pb-2">{t("supportTickets.priority")}</th>
                <th className="px-4 pb-2">{t("supportTickets.created")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-muted-foreground">
                    {t("supportTickets.noTickets")}
                  </td>
                </tr>
              )}
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link
                      href={`/ai/support/tickets/show/${ticket.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {ticket.ticket_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="supportTicketStatus" value={ticket.status} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge namespace="supportTicketPriority" value={ticket.priority} />
                  </td>
                  <td className="px-4 py-2">{formatDate(ticket.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
