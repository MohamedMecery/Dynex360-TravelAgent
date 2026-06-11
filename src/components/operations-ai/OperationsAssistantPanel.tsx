"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type { OpsSnapshotRecord, OpsRecommendationRecord } from "@/lib/operations-ai/types";

interface OperationsAssistantPanelProps {
  bookingId: string;
}

export function OperationsAssistantPanel({ bookingId }: OperationsAssistantPanelProps) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<OpsSnapshotRecord | null>(null);
  const [recommendations, setRecommendations] = useState<OpsRecommendationRecord[]>([]);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, recRes] = await Promise.all([
        fetch(`/api/crm/operations/snapshots?entity_type=booking&entity_id=${bookingId}`),
        fetch(
          `/api/crm/operations/recommendations?entity_type=booking&entity_id=${bookingId}&status=open`
        ),
      ]);
      const snapBody = (await snapRes.json()) as { data?: OpsSnapshotRecord | null };
      const recBody = (await recRes.json()) as { data?: OpsRecommendationRecord[] };
      setSnapshot(snapBody.data ?? null);
      setRecommendations(recBody.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ask = async () => {
    if (!message.trim()) return;
    setAsking(true);
    try {
      const res = await fetch("/api/ai/operations-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          booking_id: bookingId,
        }),
      });
      const body = (await res.json()) as {
        data?: { answer: string; conversation_id: string };
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed");
      setAnswer(body.data?.answer ?? null);
      setConversationId(body.data?.conversation_id);
      setMessage("");
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "Error");
    } finally {
      setAsking(false);
    }
  };

  const dismissRec = async (id: string) => {
    await fetch(`/api/crm/operations/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    });
    void load();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("opsAi.panelTitle")}</CardTitle>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {snapshot && (
          <div className="flex flex-wrap gap-3 text-sm">
            {snapshot.health_score != null && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("opsAi.health")}: {snapshot.health_score}
              </span>
            )}
            {snapshot.readiness_score != null && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("opsAi.readiness")}: {snapshot.readiness_score}%
              </span>
            )}
            {snapshot.operational_status && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("opsAi.status")}: {snapshot.operational_status.replace(/_/g, " ")}
              </span>
            )}
            {snapshot.confidence < 0.5 && (
              <span className="text-muted-foreground">{t("opsAi.lowConfidence")}</span>
            )}
          </div>
        )}

        {snapshot?.readiness_checklist?.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.readiness_checklist.map((item) => (
              <li
                key={item.code}
                className={item.complete ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}
              >
                {item.complete ? "✓" : "○"} {item.label}
              </li>
            ))}
          </ul>
        ) : null}

        {snapshot?.risk_indicators?.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.risk_indicators.map((risk) => (
              <li key={risk.code} className="text-amber-700 dark:text-amber-400">
                • {risk.label}
              </li>
            ))}
          </ul>
        ) : null}

        {recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("opsAi.recommendations")}</p>
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{rec.title}</p>
                <p className="text-muted-foreground">{rec.description}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void dismissRec(rec.id)}
                  >
                    {t("opsAi.dismiss")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("opsAi.askPlaceholder")}
          />
          <Button type="button" size="sm" disabled={asking} onClick={() => void ask()}>
            {asking ? t("common.loading") : t("opsAi.ask")}
          </Button>
          {answer && (
            <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{answer}</div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          <Link href="/crm/operations-insights" className="underline">
            {t("opsAi.insightsLink")}
          </Link>
        </p>
      </div>
    </Card>
  );
}
