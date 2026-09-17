ALTER TABLE workflow_results
  ADD COLUMN IF NOT EXISTS delivery_count integer NOT NULL DEFAULT 1;

ALTER TABLE workflow_results
  ADD COLUMN IF NOT EXISTS last_received_at timestamptz NOT NULL DEFAULT now();

UPDATE workflow_results
SET last_received_at = received_at
WHERE delivery_count = 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_results_delivery_count_positive'
      AND conrelid = 'workflow_results'::regclass
  ) THEN
    ALTER TABLE workflow_results
      ADD CONSTRAINT workflow_results_delivery_count_positive CHECK (delivery_count >= 1);
  END IF;
END
$$;
