import { SupabaseClient } from "@supabase/supabase-js";
import { buildAnalyticsInsights } from "@/lib/ai/analytics/insights";
import type {
  AgentUsageRow,
  AiAnalyticsData,
  AnalyticsExecutive,
  AnalyticsSupport,
  AnalyticsUsageTrends,
  TopDestinationRow,
  TopDocumentRow,
  TopPackageRow,
} from "@/lib/ai/analytics/types";
import type { AiAgentKey } from "@/types";

interface RpcErrorPayload {
  code: string;
  message: string;
}

interface RpcAnalyticsPayload {
  period?: { from: string; to: string };
  executive?: AnalyticsExecutive;
  agent_usage?: Array<{ agent_key: string; count: number }>;
  support?: AnalyticsSupport;
  top_documents?: TopDocumentRow[];
  top_packages?: TopPackageRow[];
  top_destinations?: TopDestinationRow[];
  usage_trends?: {
    conversation_volume?: Array<{ day: string; conversation_count: number }>;
    daily_active_users?: Array<{ day: string; active_users: number }>;
  };
  error?: RpcErrorPayload;
}

function isAgentKey(value: string): value is AiAgentKey {
  return value === "knowledge" || value === "booking" || value === "support";
}

function normalizeAgentUsage(
  rows: Array<{ agent_key: string; count: number }> | undefined
): AgentUsageRow[] {
  if (!rows) return [];
  return rows
    .filter((row): row is AgentUsageRow => isAgentKey(row.agent_key))
    .map((row) => ({ agent_key: row.agent_key, count: row.count }));
}

function emptyUsageTrends(): AnalyticsUsageTrends {
  return { conversation_volume: [], daily_active_users: [] };
}

export async function fetchAiAnalytics(
  supabase: SupabaseClient,
  from: Date,
  to: Date,
  locale: "en" | "ar" = "en"
): Promise<AiAnalyticsData> {
  const { data, error } = await supabase.rpc("get_ai_analytics", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = data as RpcAnalyticsPayload | null;

  if (!payload) {
    throw new Error("Analytics RPC returned no data");
  }

  if (payload.error) {
    throw new Error(payload.error.message ?? payload.error.code);
  }

  const executive: AnalyticsExecutive = {
    total_conversations: payload.executive?.total_conversations ?? 0,
    active_users: payload.executive?.active_users ?? 0,
    feedback_rate: payload.executive?.feedback_rate ?? null,
  };

  const support: AnalyticsSupport = {
    tickets_created: payload.support?.tickets_created ?? 0,
    tickets_resolved: payload.support?.tickets_resolved ?? 0,
  };

  const usageTrends: AnalyticsUsageTrends = {
    conversation_volume: payload.usage_trends?.conversation_volume ?? [],
    daily_active_users: payload.usage_trends?.daily_active_users ?? [],
  };

  const result: AiAnalyticsData = {
    period: {
      from: payload.period?.from ?? from.toISOString(),
      to: payload.period?.to ?? to.toISOString(),
    },
    executive,
    agent_usage: normalizeAgentUsage(payload.agent_usage),
    support,
    top_documents: payload.top_documents ?? [],
    top_packages: payload.top_packages ?? [],
    top_destinations: payload.top_destinations ?? [],
    usage_trends: usageTrends,
    insights: [],
  };

  result.insights = buildAnalyticsInsights(result, locale);

  return result;
}

export { emptyUsageTrends };
