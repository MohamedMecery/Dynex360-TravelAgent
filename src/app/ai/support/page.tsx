"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useAiConversationResume } from "@/hooks/use-ai-conversation-resume";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/locale-provider";
import { AiMessageFeedback } from "@/components/ai/ai-message-feedback";
import { KnowledgeCitation, SupportAgentResponse } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KnowledgeCitation[];
  ticketNumber?: string;
  bookingSummary?: string;
}

function SupportAgentContent() {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createTicket, setCreateTicket] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useAiConversationResume({ setConversationId, setMessages });

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);

    try {
      const response = await fetch("/api/ai/support-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          session_id: sessionId,
          create_ticket: createTicket,
          locale,
        }),
      });

      const payload = (await response.json()) as {
        data?: SupportAgentResponse;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("supportAgent.errorGeneric"));
      }

      const data = payload.data;
      if (!data) throw new Error(t("supportAgent.errorGeneric"));

      setConversationId(data.conversation_id);
      setSessionId(data.session_id);
      setCreateTicket(false);

      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id ?? crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          citations: data.citations,
          ticketNumber: data.ticket?.ticket_number,
          bookingSummary: data.booking_summary,
        },
      ]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("supportAgent.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t("supportAgent.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("supportAgent.subtitle")}</p>
        </div>
        <Link
          href="/ai/support/tickets"
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          {t("supportAgent.viewTickets")}
        </Link>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">{t("supportAgent.chatTitle")}</CardTitle>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("supportAgent.emptyState")}</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                message.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.ticketNumber && (
                <Badge className="mt-2">
                  {t("supportAgent.ticketLabel")}: {message.ticketNumber}
                </Badge>
              )}
              {message.bookingSummary && (
                <p className="mt-2 rounded border bg-background/50 p-2 text-xs">{message.bookingSummary}</p>
              )}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 space-y-1 border-t pt-2 text-xs opacity-80">
                  {message.citations.map((c) => (
                    <p key={c.chunk_id}>• {c.document_title}</p>
                  ))}
                </div>
              )}
              {message.role === "assistant" && message.id && (
                <AiMessageFeedback messageId={message.id} />
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">{t("supportAgent.thinking")}</p>}
        </div>

        {error && <p className="border-t px-4 py-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-2 border-t p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createTicket}
              onChange={(e) => setCreateTicket(e.target.checked)}
            />
            {t("supportAgent.forceTicket")}
          </label>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={t("supportAgent.placeholder")}
              disabled={loading}
              className="min-h-[60px] flex-1 resize-none"
              rows={2}
            />
            <Button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
              {t("supportAgent.send")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SupportAgentPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<p className="text-muted-foreground">{t("common.loading")}</p>}>
      <SupportAgentContent />
    </Suspense>
  );
}
