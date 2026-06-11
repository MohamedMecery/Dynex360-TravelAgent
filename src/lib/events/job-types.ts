/** Sprint 8D — async dispatch job types. */
export const DISPATCH_JOB_TYPE = {
  NOTIFICATION: "dispatch.notification",
  EMAIL: "dispatch.email",
  WHATSAPP: "dispatch.whatsapp",
  AI_SCORE: "dispatch.ai_score",
  AI_OPS_SCORE: "dispatch.ai_ops_score",
} as const;

export type DispatchJobType =
  (typeof DISPATCH_JOB_TYPE)[keyof typeof DISPATCH_JOB_TYPE];

export const DISPATCH_JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  DEAD_LETTER: "dead_letter",
} as const;

export type DispatchJobStatus =
  (typeof DISPATCH_JOB_STATUS)[keyof typeof DISPATCH_JOB_STATUS];

export interface EventDispatchJobRecord {
  id: string;
  tenant_id: string;
  domain_event_id: string;
  job_type: DispatchJobType | string;
  status: DispatchJobStatus | string;
  idempotency_key: string;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function buildDispatchJobIdempotencyKey(
  jobType: string,
  domainEventId: string
): string {
  return `${jobType}:${domainEventId}`;
}

/** Scheduled automation template keys (framework only — inactive in 8D). */
export const SCHEDULED_AUTOMATION_TEMPLATE = {
  QUOTATION_EXPIRING_SOON: "quotation.expiring_soon",
  BOOKING_DEPARTURE_REMINDER: "booking.departure_reminder",
  BOOKING_RETURN_REMINDER: "booking.return_reminder",
  CUSTOMER_FOLLOW_UP_DUE: "customer.follow_up_due",
} as const;

export type ScheduledAutomationTemplateKey =
  (typeof SCHEDULED_AUTOMATION_TEMPLATE)[keyof typeof SCHEDULED_AUTOMATION_TEMPLATE];
