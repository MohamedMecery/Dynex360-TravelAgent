"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useList } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/locale-provider";
import { AiMessageFeedback } from "@/components/ai/ai-message-feedback";
import { useAiConversationResume } from "@/hooks/use-ai-conversation-resume";
import {
  BookingAgentPendingAction,
  BookingAgentResponse,
  BookingPackageRecommendation,
  Customer,
  Package,
  PricingTier,
} from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: BookingPackageRecommendation[];
  pendingAction?: BookingAgentPendingAction;
  draftRef?: string;
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

function pendingActionLabel(
  action: BookingAgentPendingAction,
  t: (key: string) => string
): string {
  switch (action.type) {
    case "create_draft":
      return t("bookingAgent.pendingCreateDraft");
    case "update_draft":
      return t("bookingAgent.pendingUpdateDraft");
    case "propose_cancellation":
      return t("bookingAgent.pendingCancellation");
    default:
      return t("bookingAgent.confirmAction");
  }
}

function BookingAgentContent() {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [activeDraft, setActiveDraft] = useState<{ ref: string; bookingId?: string } | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useAiConversationResume({ setConversationId, setMessages });

  const { data: customersData } = useList<Customer>({
    resource: "customers",
    pagination: { pageSize: 100 },
  });
  const { data: packagesData } = useList<Package>({
    resource: "packages",
    filters: [{ field: "status", operator: "eq", value: "published" }],
    pagination: { pageSize: 100 },
  });

  const [draftForm, setDraftForm] = useState({
    customer_id: "",
    package_id: "",
    travel_date: "",
    traveler_first: "",
    traveler_last: "",
    tier: "adult" as PricingTier,
  });

  const quickPrompts = useMemo(
    () => [
      t("bookingAgent.promptPackageSearch"),
      t("bookingAgent.promptStatus"),
      t("bookingAgent.promptUpdateDraft"),
    ],
    [t]
  );

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const callAgent = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/ai/booking-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        conversation_id: conversationId,
        session_id: sessionId,
        locale,
      }),
    });

    const payload = (await response.json()) as {
      data?: BookingAgentResponse;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? t("bookingAgent.errorGeneric"));
    }

    const data = payload.data;
    if (!data) throw new Error(t("bookingAgent.errorGeneric"));

    setConversationId(data.conversation_id);
    setSessionId(data.session_id);

    return data;
  };

  const appendAssistant = (data: BookingAgentResponse) => {
    if (data.draft?.reference_number) {
      setActiveDraft({
        ref: data.draft.reference_number,
        bookingId: data.draft.booking_id,
      });
    }

    setMessages((prev) => [
      ...prev,
      {
        id: data.message_id ?? crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        recommendations: data.recommendations,
        pendingAction: data.pending_action,
        draftRef: data.draft?.reference_number,
      },
    ]);
    setTimeout(scrollToBottom, 50);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    if (!textOverride) setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);

    try {
      const data = await callAgent({ message: text });
      appendAssistant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingAgent.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const previewDraft = async () => {
    if (!draftForm.customer_id || !draftForm.package_id || !draftForm.travel_date) return;

    setError(null);
    setLoading(true);

    try {
      const data = await callAgent({
        confirm_action: {
          type: "create_draft",
          customer_id: draftForm.customer_id,
          package_id: draftForm.package_id,
          travel_date: draftForm.travel_date,
          travelers: [
            {
              first_name: draftForm.traveler_first || "Traveler",
              last_name: draftForm.traveler_last || "One",
              tier: draftForm.tier,
            },
          ],
        },
      });
      appendAssistant(data);
      setShowDraftForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingAgent.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const applyPending = async (action: BookingAgentPendingAction) => {
    setError(null);
    setLoading(true);

    try {
      const data = await callAgent({ apply_action: action });
      appendAssistant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingAgent.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const activeDraftHref = activeDraft?.bookingId
    ? `/bookings/show/${activeDraft.bookingId}`
    : "/bookings";

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col min-h-0">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t("bookingAgent.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("bookingAgent.subtitle")}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <Link href="/bookings" className="text-primary hover:underline">
              {t("bookingAgent.openBookings")}
            </Link>
            <Link href="/ai/history" className="text-muted-foreground hover:underline">
              {t("aiHistory.title")}
            </Link>
          </div>
        </div>

        {activeDraft && (
          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {interpolate(t("bookingAgent.activeDraft"), { ref: activeDraft.ref })}{" "}
            <Link href={activeDraftHref} className="font-medium underline">
              {t("common.view")}
            </Link>
          </div>
        )}

        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b py-3 flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("bookingAgent.chatTitle")}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowDraftForm((v) => !v)}>
              {t("bookingAgent.draftBuilder")}
            </Button>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("bookingAgent.emptyState")}</p>
                <p className="text-xs text-muted-foreground">{t("bookingAgent.updateDraftHint")}</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => void sendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={cn(
                    "max-w-[90%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "ms-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {message.recommendations.map((pkg) => (
                      <div key={pkg.id} className="rounded border bg-background p-3 text-xs">
                        <p className="font-medium">{pkg.title}</p>
                        <p className="text-muted-foreground">
                          {pkg.destination_name ?? "—"}
                          {pkg.adult_price !== undefined &&
                            ` · ${pkg.currency} ${pkg.adult_price}`}
                        </p>
                        <p className="mt-1 font-mono text-[10px] opacity-70">{pkg.id}</p>
                      </div>
                    ))}
                  </div>
                )}
                {message.draftRef && (
                  <Badge className="mt-2">
                    {t("bookingAgent.draftRef")}: {message.draftRef}
                  </Badge>
                )}
                {message.pendingAction && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {pendingActionLabel(message.pendingAction, t)}
                    </span>
                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={() => void applyPending(message.pendingAction!)}
                    >
                      {t("bookingAgent.confirmAction")}
                    </Button>
                  </div>
                )}
                {message.role === "assistant" && message.id && (
                  <AiMessageFeedback messageId={message.id} className="max-w-[90%]" />
                )}
              </div>
            ))}
            {loading && (
              <p className="text-sm text-muted-foreground">{t("bookingAgent.thinking")}</p>
            )}
          </div>

          {error && <p className="border-t px-4 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 border-t p-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={t("bookingAgent.placeholder")}
              disabled={loading}
              className="min-h-[60px] flex-1 resize-none"
              rows={2}
            />
            <Button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
              {t("bookingAgent.send")}
            </Button>
          </div>
        </Card>
      </div>

      {showDraftForm && (
        <Card className="w-full shrink-0 p-4 lg:w-80">
          <h3 className="mb-3 font-semibold">{t("bookingAgent.draftBuilder")}</h3>
          <div className="space-y-3 text-sm">
            <div>
              <Label>{t("fields.customer")}</Label>
              <Select
                value={draftForm.customer_id}
                onChange={(e) => setDraftForm((f) => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">{t("common.select")}</option>
                {(customersData?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("fields.package")}</Label>
              <Select
                value={draftForm.package_id}
                onChange={(e) => setDraftForm((f) => ({ ...f, package_id: e.target.value }))}
              >
                <option value="">{t("common.select")}</option>
                {(packagesData?.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("fields.travelDate")}</Label>
              <Input
                type="date"
                value={draftForm.travel_date}
                onChange={(e) => setDraftForm((f) => ({ ...f, travel_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("bookingAgent.travelerFirst")}</Label>
                <Input
                  value={draftForm.traveler_first}
                  onChange={(e) => setDraftForm((f) => ({ ...f, traveler_first: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("bookingAgent.travelerLast")}</Label>
                <Input
                  value={draftForm.traveler_last}
                  onChange={(e) => setDraftForm((f) => ({ ...f, traveler_last: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>{t("bookingAgent.tier")}</Label>
              <Select
                value={draftForm.tier}
                onChange={(e) =>
                  setDraftForm((f) => ({ ...f, tier: e.target.value as PricingTier }))
                }
              >
                <option value="adult">{t("bookingAgent.tiers.adult")}</option>
                <option value="child">{t("bookingAgent.tiers.child")}</option>
                <option value="infant">{t("bookingAgent.tiers.infant")}</option>
              </Select>
            </div>
            <Button className="w-full" disabled={loading} onClick={() => void previewDraft()}>
              {t("bookingAgent.previewDraft")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("bookingAgent.hitlNote")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function BookingAgentPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<p className="text-muted-foreground">{t("common.loading")}</p>}>
      <BookingAgentContent />
    </Suspense>
  );
}
