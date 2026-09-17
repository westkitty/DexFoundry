export interface WorkflowEnvelope<T = Record<string, unknown>> {
  schemaVersion: "1";
  outboxId: string;
  eventId: string;
  idempotencyKey: string;
  topic: string;
  companyId: string;
  occurredAt: string;
  payload: T;
}

export interface WorkflowResult<T = Record<string, unknown>> {
  schemaVersion: "1";
  idempotencyKey: string;
  workflow: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  completedAt: string;
  outputs?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
