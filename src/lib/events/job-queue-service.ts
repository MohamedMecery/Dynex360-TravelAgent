import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";
import {
  buildDispatchJobIdempotencyKey,
  DISPATCH_JOB_TYPE,
} from "@/lib/events/job-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHATSAPP_EVENT_TYPES } from "@/lib/whatsapp/whatsapp-event-config";
import { shouldEnqueueSalesScore } from "@/lib/sales-ai/sales-event-config";
import { shouldEnqueueOpsScore } from "@/lib/operations-ai/ops-event-config";

const EMAIL_EVENT_TYPES = new Set<string>([
  DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
  DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
]);

export class JobQueueService {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  /** Enqueue async dispatch jobs for a domain event (idempotent). */
  async enqueueForEvent(
    event: DomainEventRecord,
    options?: { skipEmail?: boolean; skipWhatsApp?: boolean }
  ): Promise<{
    notificationJobId: string | null;
    emailJobId: string | null;
    whatsappJobId: string | null;
    aiScoreJobId: string | null;
    aiOpsScoreJobId: string | null;
  }> {
    const notificationJobId = await this.enqueueJob(
      event,
      DISPATCH_JOB_TYPE.NOTIFICATION
    );

    let emailJobId: string | null = null;
    if (!options?.skipEmail && EMAIL_EVENT_TYPES.has(event.event_type)) {
      emailJobId = await this.enqueueJob(event, DISPATCH_JOB_TYPE.EMAIL);
    }

    let whatsappJobId: string | null = null;
    if (!options?.skipWhatsApp && WHATSAPP_EVENT_TYPES.has(event.event_type)) {
      whatsappJobId = await this.enqueueJob(event, DISPATCH_JOB_TYPE.WHATSAPP);
    }

    let aiScoreJobId: string | null = null;
    if (shouldEnqueueSalesScore(event.event_type)) {
      aiScoreJobId = await this.enqueueJob(event, DISPATCH_JOB_TYPE.AI_SCORE);
    }

    let aiOpsScoreJobId: string | null = null;
    if (shouldEnqueueOpsScore(event.event_type)) {
      aiOpsScoreJobId = await this.enqueueJob(event, DISPATCH_JOB_TYPE.AI_OPS_SCORE);
    }

    return { notificationJobId, emailJobId, whatsappJobId, aiScoreJobId, aiOpsScoreJobId };
  }

  private async enqueueJob(
    event: DomainEventRecord,
    jobType: string
  ): Promise<string | null> {
    const { data, error } = await this.admin.rpc("enqueue_event_dispatch_job", {
      p_tenant_id: event.tenant_id,
      p_domain_event_id: event.id,
      p_job_type: jobType,
      p_idempotency_key: buildDispatchJobIdempotencyKey(jobType, event.id),
      p_max_retries: 5,
    });

    if (error) {
      throw new Error(`enqueue_event_dispatch_job failed: ${error.message}`);
    }

    return (data as string | null) ?? null;
  }
}

let defaultQueue: JobQueueService | null = null;

export function getJobQueueService(): JobQueueService {
  if (!defaultQueue) {
    defaultQueue = new JobQueueService();
  }
  return defaultQueue;
}
