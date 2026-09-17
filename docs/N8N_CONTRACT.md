# n8n Integration Contract

DexFoundry treats n8n as an execution/orchestration surface, never as canonical business state.

## Boundary

- PostgreSQL owns company state, suppression state, durable events, and the outbox.
- n8n consumes outbox envelopes and performs external work.
- n8n must not mutate company state directly.
- Workflow results return to DexFoundry through an authenticated API/worker boundary that validates the current state before any transition.

## Delivery model

Outbox delivery is **at least once**. Therefore every workflow must be idempotent.

The stable key is `idempotencyKey` from the `WorkflowEnvelope`. A workflow must record or otherwise recognize completed keys before performing irreversible work such as sending email, provisioning a customer, or issuing a payment-side mutation.

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

Failures must additionally include:

```json
{
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "bounded diagnostic text",
    "retryable": true
  }
}
```

## Retry rules

- Retry transport and transient upstream failures with bounded backoff.
- Do not retry policy failures, suppression matches, invalid state, malformed input, or explicit unsubscribe events.
- A failed workflow must never claim success merely because one internal node succeeded.
- External side effects must occur after idempotency checks.

## Initial topics

- `foundry.company.state.changed`
- `foundry.opportunity.scored`

Future adapters may introduce enrichment, POC, outreach, onboarding, delivery, reporting, and retention topics without changing the database ownership rule.
