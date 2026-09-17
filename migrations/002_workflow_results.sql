CREATE TABLE IF NOT EXISTS workflow_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  workflow text NOT NULL,
  outbox_id uuid NOT NULL REFERENCES foundry_outbox(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES foundry_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('SUCCEEDED', 'FAILED', 'SKIPPED')),
  result_hash text NOT NULL,
  outputs jsonb,
  error jsonb,
  completed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key, workflow)
);

CREATE INDEX IF NOT EXISTS idx_workflow_results_company_received
  ON workflow_results(company_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_results_idempotency
  ON workflow_results(idempotency_key);
