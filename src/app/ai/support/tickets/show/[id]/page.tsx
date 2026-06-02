"use client";

import Link from "next/link";
import { useList, useOne } from "@refinedev/core";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SupportTicketActions } from "@/components/support/support-ticket-actions";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { SupportTicket, SupportTicketMessage } from "@/types";

export default function SupportTicketShowPage() {
  const { t, isRtl } = useTranslation();
  const backArrow = isRtl ? "→" : "←";
  const { formatDate } = useFormat();
  const params = useParams();
  const id = params.id as string;

  const { data: ticketData, isLoading, refetch } = useOne<SupportTicket>({
    resource: "support_tickets",
    id,
  });

  const { data: messagesData, refetch: refetchMessages } = useList<SupportTicketMessage>({
    resource: "support_ticket_messages",
    filters: [{ field: "ticket_id", operator: "eq", value: id }],
    pagination: { pageSize: 100 },
    sorters: [{ field: "created_at", order: "asc" }],
  });

  const ticket = ticketData?.data;
  const messages = messagesData?.data ?? [];

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!ticket) {
    return <p className="text-red-600">{t("supportTickets.notFound")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ai/support/tickets" className="text-sm text-muted-foreground hover:underline">
          {backArrow} {t("supportTickets.title")}
        </Link>
        <h2 className="mt-2 font-mono text-xl font-bold">{ticket.ticket_number}</h2>
        <p className="text-muted-foreground">{ticket.subject}</p>
        <div className="mt-2 flex gap-2">
          <StatusBadge namespace="supportTicketStatus" value={ticket.status} />
          <StatusBadge namespace="supportTicketPriority" value={ticket.priority} />
        </div>
      </div>

      <SupportTicketActions
        ticket={ticket}
        onUpdated={() => {
          void refetch();
          void refetchMessages();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("supportTickets.thread")}</CardTitle>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("supportTickets.noMessages")}</p>
          )}
          {messages.map((message) => (
            <div key={message.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{message.author_type}</span>
                <span>{formatDate(message.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
