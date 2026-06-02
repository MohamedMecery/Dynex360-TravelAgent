"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { AiFeedbackRating } from "@/types";
import { cn } from "@/lib/utils";

interface AiMessageFeedbackProps {
  messageId: string;
  className?: string;
}

export function AiMessageFeedback({ messageId, className }: AiMessageFeedbackProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [rating, setRating] = useState<AiFeedbackRating | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (nextRating: AiFeedbackRating) => {
    if (submitting || rating === nextRating) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, rating: nextRating }),
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("aiFeedback.errorGeneric"));
      }

      setRating(nextRating);
      success(t("aiFeedback.thanks"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("aiFeedback.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("mt-2 flex items-center gap-1 border-t pt-2", className)}>
      <span className="me-1 text-xs text-muted-foreground">{t("aiFeedback.prompt")}</span>
      <Button
        type="button"
        size="sm"
        variant={rating === "helpful" ? "default" : "ghost"}
        className="h-7 px-2"
        disabled={submitting}
        aria-label={t("aiFeedback.helpful")}
        onClick={() => void submitFeedback("helpful")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={rating === "not_helpful" ? "default" : "ghost"}
        className="h-7 px-2"
        disabled={submitting}
        aria-label={t("aiFeedback.notHelpful")}
        onClick={() => void submitFeedback("not_helpful")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
