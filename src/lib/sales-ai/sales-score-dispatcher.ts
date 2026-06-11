import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecommendationEvaluator } from "@/lib/sales-ai/recommendation-evaluator";

export class SalesScoreDispatcher {
  private readonly evaluator: RecommendationEvaluator;

  constructor(private readonly admin: SupabaseClient = createAdminClient()) {
    this.evaluator = new RecommendationEvaluator(admin);
  }

  async process(event: DomainEventRecord): Promise<void> {
    await this.evaluator.evaluateForEvent(event);
  }
}

let defaultDispatcher: SalesScoreDispatcher | null = null;

export function getSalesScoreDispatcher(admin?: SupabaseClient): SalesScoreDispatcher {
  if (admin) return new SalesScoreDispatcher(admin);
  if (!defaultDispatcher) {
    defaultDispatcher = new SalesScoreDispatcher();
  }
  return defaultDispatcher;
}
