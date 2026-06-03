"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import { useList } from "@refinedev/core";
import type { AiMessageRole } from "@/types";

export interface ResumeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseAiConversationResumeOptions {
  setConversationId: (id: string) => void;
  setMessages: Dispatch<SetStateAction<ResumeChatMessage[]>>;
}

/** Restore conversation_id from URL and load prior turns into the chat UI. */
export function useAiConversationResume({
  setConversationId,
  setMessages,
}: UseAiConversationResumeOptions): void {
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation_id");
  const hydrated = useRef(false);

  useEffect(() => {
    if (conversationParam) {
      setConversationId(conversationParam);
    }
  }, [conversationParam, setConversationId]);

  const { data: historyData } = useList<{
    id: string;
    role: AiMessageRole;
    content: string;
  }>({
    resource: "ai_messages",
    filters: conversationParam
      ? [{ field: "conversation_id", operator: "eq", value: conversationParam }]
      : [],
    sorters: [{ field: "created_at", order: "asc" }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled: !!conversationParam },
  });

  useEffect(() => {
    if (!conversationParam || hydrated.current) return;
    const rows = historyData?.data ?? [];
    if (rows.length === 0) return;

    const visible = rows.filter(
      (m) => m.role === "user" || m.role === "assistant"
    ) as ResumeChatMessage[];

    if (visible.length > 0) {
      setMessages(visible);
      hydrated.current = true;
    }
  }, [conversationParam, historyData?.data, setMessages]);
}
