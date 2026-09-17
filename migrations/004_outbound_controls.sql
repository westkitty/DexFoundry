CREATE TABLE IF NOT EXISTS outbound_controls (
  control_key text PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('DISABLED', 'MANUAL_ONLY', 'ENABLED')),
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (control_key = 'global')
);

INSERT INTO outbound_controls (control_key, mode, reason)
VALUES (
  'global',
  'DISABLED',
  'Default deny: external messaging requires explicit authorization and completed outbound safeguards.'
)
ON CONFLICT (control_key) DO NOTHING;
