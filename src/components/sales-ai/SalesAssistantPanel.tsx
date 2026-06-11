"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type { SalesSnapshotRecord, SalesRecommendationRecord } from "@/lib/sales-ai/types";

interface SalesAssistantPanelProps {
  entityType: "lead" | "opportunity" | "customer";
  entityId: string;
  customerId?: string;
  opportunityId?: string;
}

export function SalesAssistantPanel({
  entityType,
  entityId,
  customerId,
  opportunityId,
}: SalesAssistantPanelProps) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<SalesSnapshotRecord | null>(null);
  const [recommendations, setRecommendations] = useState<SalesRecommendationRecord[]>([]);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, recRes] = await Promise.all([
        fetch(`/api/crm/sales/snapshots?entity_type=${entityType}&entity_id=${entityId}`),
        fetch(
          `/api/crm/sales/recommendations?entity_type=${entityType}&entity_id=${entityId}&status=open`
        ),
      ]);
      const snapBody = (await snapRes.json()) as { data?: SalesSnapshotRecord | null };
      const recBody = (await recRes.json()) as { data?: SalesRecommendationRecord[] };
      setSnapshot(snapBody.data ?? null);
      setRecommendations(recBody.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ask = async () => {
    if (!message.trim()) return;
    setAsking(true);
    try {
      const res = await fetch("/api/ai/sales-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          entity_type: entityType,
          entity_id: entityId,
          customer_id: customerId,
          opportunity_id: opportunityId,
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
    await fetch(`/api/crm/sales/recommendations/${id}`, {
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
        <CardTitle className="text-base">{t("salesAi.panelTitle")}</CardTitle>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {snapshot && (
          <div className="flex flex-wrap gap-3 text-sm">
            {snapshot.health_score != null && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("salesAi.health")}: {snapshot.health_score}
              </span>
            )}
            {snapshot.priority_tier && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("salesAi.priority")}: {snapshot.priority_tier}
              </span>
            )}
            {snapshot.win_probability != null && (
              <span className="rounded-md bg-muted px-2 py-1">
                {t("salesAi.winProb")}: {snapshot.win_probability}%
              </span>
            )}
            {snapshot.confidence < 0.5 && (
              <span className="text-muted-foreground">{t("salesAi.lowConfidence")}</span>
            )}
          </div>
        )}

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
            <p className="text-sm font-medium">{t("salesAi.recommendations")}</p>
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
                    {t("salesAi.dismiss")}
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
            placeholder={t("salesAi.askPlaceholder")}
          />
          <Button type="button" size="sm" disabled={asking} onClick={() => void ask()}>
            {asking ? t("common.loading") : t("salesAi.ask")}
          </Button>
          {answer && (
            <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{answer}</div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          <Link href="/crm/sales-insights" className="underline">
            {t("salesAi.insightsLink")}
          </Link>
        </p>
      </div>
    </Card>
  );
}
