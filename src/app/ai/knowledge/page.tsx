"use client";

import { useCallback, useRef, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/locale-provider";
import { AiMessageFeedback } from "@/components/ai/ai-message-feedback";
import { KnowledgeAgentResponse, KnowledgeCitation, UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KnowledgeCitation[];
  confidence?: "low" | "medium" | "high";
}

export default function KnowledgeAgentPage() {
  const { t, locale } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/ai/knowledge-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          session_id: sessionId,
          locale,
        }),
      });

      const payload = (await response.json()) as {
        data?: KnowledgeAgentResponse;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("knowledgeAgent.errorGeneric"));
      }

      const data = payload.data;
      if (!data) {
        throw new Error(t("knowledgeAgent.errorGeneric"));
      }

      setConversationId(data.conversation_id);
      setSessionId(data.session_id);

      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id ?? crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          citations: data.citations,
          confidence: data.confidence,
        },
      ]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("knowledgeAgent.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{t("knowledgeAgent.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("knowledgeAgent.subtitle")}</p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">{t("knowledgeAgent.chatTitle")}</CardTitle>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("knowledgeAgent.emptyState")}</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                message.role === "user"
                  ? "ms-auto bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && message.confidence && (
                <Badge className="mt-2 text-xs">
                  {t(`knowledgeAgent.confidence.${message.confidence}`)}
                </Badge>
              )}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-2">
                  <p className="text-xs font-medium opacity-80">{t("knowledgeAgent.sources")}</p>
                  {message.citations.map((citation) => (
                    <div key={citation.chunk_id} className="rounded border bg-background/50 p-2 text-xs">
                      <p className="font-medium">{citation.document_title}</p>
                      <p className="text-muted-foreground">{citation.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
              {message.role === "assistant" && message.id && (
                <AiMessageFeedback messageId={message.id} />
              )}
            </div>
          ))}
          {loading && (
            <p className="text-sm text-muted-foreground">{t("knowledgeAgent.thinking")}</p>
          )}
        </div>

        {error && (
          <p className="border-t px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2 border-t p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("knowledgeAgent.placeholder")}
            disabled={loading}
            className="min-h-[60px] flex-1 resize-none"
            rows={2}
          />
          <Button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
            {t("knowledgeAgent.send")}
          </Button>
        </div>
      </Card>

      {identity?.role === "tenant_admin" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("knowledgeAgent.adminHint")}
        </p>
      )}
    </div>
  );
}
