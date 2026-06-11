import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { NotificationDispatcher } from "@/lib/events/notification-dispatcher";
import { EmailDispatcher } from "@/lib/events/email-dispatcher";
import { WhatsAppDispatcher } from "@/lib/whatsapp/whatsapp-dispatcher";
import { getSalesScoreDispatcher } from "@/lib/sales-ai/sales-score-dispatcher";
import { getOperationsScoreDispatcher } from "@/lib/operations-ai/operations-score-dispatcher";
import {
  DISPATCH_JOB_TYPE,
  type EventDispatchJobRecord,
} from "@/lib/events/job-types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface WorkerProcessResult {
  processed: number;
  completed: number;
  failed: number;
  deadLetter: number;
  errors: { jobId: string; message: string }[];
}

export class EventDispatchWorker {
  private readonly notificationDispatcher: NotificationDispatcher;
  private readonly emailDispatcher: EmailDispatcher;
  private readonly whatsAppDispatcher: WhatsAppDispatcher;
  private readonly salesScoreDispatcher = getSalesScoreDispatcher();
  private readonly operationsScoreDispatcher = getOperationsScoreDispatcher();

  constructor(
    private readonly admin: SupabaseClient = createAdminClient(),
    dispatchers?: {
      notification?: NotificationDispatcher;
      email?: EmailDispatcher;
      whatsapp?: WhatsAppDispatcher;
    }
  ) {
    this.notificationDispatcher = dispatchers?.notification ?? new NotificationDispatcher(admin);
    this.emailDispatcher = dispatchers?.email ?? new EmailDispatcher(admin);
    this.whatsAppDispatcher = dispatchers?.whatsapp ?? new WhatsAppDispatcher(admin);
  }

  async processBatch(options?: {
    workerId?: string;
    batchSize?: number;
  }): Promise<WorkerProcessResult> {
    const workerId = options?.workerId ?? `worker-${Date.now()}`;
    const batchSize = options?.batchSize ?? 20;

    const { data: jobs, error: claimError } = await this.admin.rpc(
      "claim_event_dispatch_jobs",
      {
        p_worker_id: workerId,
        p_batch_size: batchSize,
      }
    );

    if (claimError) {
      throw new Error(`claim_event_dispatch_jobs failed: ${claimError.message}`);
    }

    const result: WorkerProcessResult = {
      processed: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
      errors: [],
    };

    for (const job of (jobs ?? []) as EventDispatchJobRecord[]) {
      result.processed += 1;
      try {
        await this.processJob(job);
        await this.admin.rpc("complete_event_dispatch_job", { p_job_id: job.id });
        result.completed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Job processing failed";
        const { data: finalStatus, error: failError } = await this.admin.rpc(
          "fail_event_dispatch_job",
          {
            p_job_id: job.id,
            p_error: message,
          }
        );

        if (failError) {
          result.errors.push({ jobId: job.id, message: failError.message });
        } else if (finalStatus === "dead_letter") {
          result.deadLetter += 1;
        } else {
          result.failed += 1;
        }
        result.errors.push({ jobId: job.id, message });
      }
    }

    return result;
  }

  private async processJob(job: EventDispatchJobRecord): Promise<void> {
    const event = await this.loadDomainEvent(job.domain_event_id);
    if (!event) {
      throw new Error(`Domain event not found: ${job.domain_event_id}`);
    }

    if (job.job_type === DISPATCH_JOB_TYPE.NOTIFICATION) {
      await this.notificationDispatcher.process(event);
      return;
    }

    if (job.job_type === DISPATCH_JOB_TYPE.EMAIL) {
      const outcome = await this.emailDispatcher.process(event);
      if (outcome === "failed") {
        throw new Error("Email delivery failed");
      }
      return;
    }

    if (job.job_type === DISPATCH_JOB_TYPE.WHATSAPP) {
      const outcome = await this.whatsAppDispatcher.process(event);
      if (outcome === "failed") {
        throw new Error("WhatsApp delivery failed");
      }
      return;
    }

    if (job.job_type === DISPATCH_JOB_TYPE.AI_SCORE) {
      await this.salesScoreDispatcher.process(event);
      return;
    }

    if (job.job_type === DISPATCH_JOB_TYPE.AI_OPS_SCORE) {
      await this.operationsScoreDispatcher.process(event);
      return;
    }

    throw new Error(`Unknown job type: ${job.job_type}`);
  }

  private async loadDomainEvent(eventId: string): Promise<DomainEventRecord | null> {
    const { data, error } = await this.admin
      .from("domain_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as DomainEventRecord | null) ?? null;
  }
}

let defaultWorker: EventDispatchWorker | null = null;

export function getEventDispatchWorker(): EventDispatchWorker {
  if (!defaultWorker) {
    defaultWorker = new EventDispatchWorker();
  }
  return defaultWorker;
}
