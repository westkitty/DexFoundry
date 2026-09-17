# n8n Integration Contract

DexFoundry treats n8n as an execution/orchestration surface, never as canonical business state.

## Boundary

- PostgreSQL owns company state, suppression state, durable events, workflow results, and the transactional outbox.
- n8n consumes outbox envelopes and performs external work.
- n8n must not mutate company state directly.
- Workflow results return through DexFoundry's authenticated result-ingestion boundary.

## Delivery model

Outbox delivery is **at least once**. Every workflow must therefore be idempotent. The stable key is `idempotencyKey` from the `WorkflowEnvelope`.

DexFoundry stores one result for each `(idempotencyKey, workflow)` pair. Replaying the identical result is accepted as a duplicate no-op. Reusing the same pair with different result content is rejected as a conflict.

Stale `PROCESSING` outbox claims may be requeued after the bounded recovery window, so external side effects must occur only after the consumer has performed its own idempotency check.

## Webhook authentication

Dispatcher requests include:

- `X-DexFoundry-Timestamp`: Unix timestamp in seconds.
- `X-DexFoundry-Signature`: `v1=<hex HMAC-SHA256>` over `<timestamp>.<raw-body>`.
- `X-DexFoundry-Idempotency-Key`: the envelope idempotency key.

The shared secret must be at least 32 characters and must never be committed to the repository. Production endpoints must use HTTPS. Result callbacks use the same signing scheme and are rejected outside a five-minute replay window.

## Required input envelope

```json
{
  "schemaVersion": "1",
  "outboxId": "uuid",
  "eventId": "uuid",
  "idempotencyKey": "event:uuid",
  "topic": "foundry.company.state.changed",
  "companyId": "uuid",
  "occurredAt": "2026-09-17T20:00:00.000Z",
  "payload": {}
}
```

## Required result envelope

```json
{
  "schemaVersion": "1",
  "idempotencyKey": "event:uuid",
  "workflow": "example-workflow",
  "status": "SUCCEEDED",
  "completedAt": "2026-09-17T20:00:10.000Z",
  "outputs": {}
}
```

Failures additionally include:

```json
{
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "bounded diagnostic text",
    "retryable": true
  }
}
```

## Runtime entry points

After build and migration:

```bash
DATABASE_URL=... \
N8N_WEBHOOK_URL=https://... \
DEXFOUNDRY_WEBHOOK_SECRET=... \
npm run dispatch:once
```

Run the callback service with:

```bash
DATABASE_URL=... \
DEXFOUNDRY_WEBHOOK_SECRET=... \
npm run results:serve
```

The result service defaults to `127.0.0.1:8787`, exposes `GET /healthz`, and accepts signed `POST /workflow-results` bodies up to 1 MiB. Binding it beyond localhost is an explicit deployment decision and should sit behind TLS/reverse-proxy controls.

## Retry rules

- Retry transport and transient upstream failures with bounded exponential backoff.
- Do not retry policy failures, suppression matches, invalid state, malformed input, explicit unsubscribe events, authentication failures, or conflicting duplicate results.
- A failed workflow must never claim success merely because one internal node succeeded.
- External irreversible side effects must occur after idempotency checks.

## Initial topics

- `foundry.company.state.changed`
- `foundry.opportunity.scored`

Future adapters may introduce enrichment, POC, outreach, onboarding, delivery, reporting, and retention topics without changing the database-ownership rule.
