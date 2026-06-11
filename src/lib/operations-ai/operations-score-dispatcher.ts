import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecommendationEvaluator } from "@/lib/operations-ai/recommendation-evaluator";

export class OperationsScoreDispatcher {
  private readonly evaluator: RecommendationEvaluator;

  constructor(private readonly admin: SupabaseClient = createAdminClient()) {
    this.evaluator = new RecommendationEvaluator(admin);
  }

  async process(event: DomainEventRecord): Promise<void> {
    await this.evaluator.evaluateForEvent(event);
  }
}

let defaultDispatcher: OperationsScoreDispatcher | null = null;

export function getOperationsScoreDispatcher(
  admin?: SupabaseClient
): OperationsScoreDispatcher {
  if (admin) return new OperationsScoreDispatcher(admin);
  if (!defaultDispatcher) {
    defaultDispatcher = new OperationsScoreDispatcher();
  }
  return defaultDispatcher;
}
