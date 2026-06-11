import type { DomainEventRecord, EmitDomainEventInput } from "@/lib/events/types";
import { EventEmitterService, getEventEmitterService } from "@/lib/events/event-emitter-service";
import { getJobQueueService, JobQueueService } from "@/lib/events/job-queue-service";
import { EventDispatchWorker, getEventDispatchWorker } from "@/lib/events/event-dispatch-worker";

/** Emit domain event and enqueue async dispatch jobs (Sprint 8D). */
export async function emitAndDispatch(
  input: EmitDomainEventInput,
  options?: {
    emitter?: EventEmitterService;
    queue?: JobQueueService;
    skipEmail?: boolean;
    /** Process jobs inline after enqueue (tests / local dev only). */
    processInline?: boolean;
  }
): Promise<DomainEventRecord> {
  const emitter = options?.emitter ?? getEventEmitterService();
  const event = await emitter.emit(input);

  const queue = options?.queue ?? getJobQueueService();
  await queue.enqueueForEvent(event, { skipEmail: options?.skipEmail });

  if (options?.processInline) {
    await getEventDispatchWorker().processBatch({ batchSize: 10 });
  }

  return event;
}

export async function dispatchExistingEvent(
  event: DomainEventRecord,
  options?: { skipEmail?: boolean; processInline?: boolean }
): Promise<void> {
  const queue = getJobQueueService();
  await queue.enqueueForEvent(event, { skipEmail: options?.skipEmail });

  if (options?.processInline) {
    await getEventDispatchWorker().processBatch({ batchSize: 10 });
  }
}

export { getEventDispatchWorker, EventDispatchWorker };
