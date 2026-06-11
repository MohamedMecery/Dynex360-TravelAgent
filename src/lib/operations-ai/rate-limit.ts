import type { SupabaseClient } from "@supabase/supabase-js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;

const requestCounts = new Map<string, { count: number; windowStart: number }>();

export function checkOperationsAgentRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= DEFAULT_MAX_REQUESTS) return false;
  entry.count += 1;
  return true;
}

export async function checkOperationsAgentTokenBudget(
  admin: SupabaseClient,
  tenantId: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; budget: number; used: number }> {
  const { data: agent } = await admin
    .from("ai_agents")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("agent_key", "operations")
    .maybeSingle();

  const budget =
    (agent?.config as { monthly_token_budget?: number } | undefined)
      ?.monthly_token_budget ?? 500_000;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: logs } = await admin
    .from("ai_logs")
    .select("payload")
    .eq("tenant_id", tenantId)
    .eq("event_type", "operations_agent_completion")
    .gte("created_at", monthStart.toISOString());

  const used = (logs ?? []).reduce((sum, row) => {
    const tokens = (row.payload as { tokens?: number })?.tokens ?? 0;
    return sum + tokens;
  }, 0);

  return {
    allowed: used + estimatedTokens <= budget,
    budget,
    used,
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
