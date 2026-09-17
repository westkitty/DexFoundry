# DexFoundry Operational State

- **Project ID:** dexfoundry
- **Project:** DexFoundry
- **Repository:** westkitty/DexFoundry
- **Revision:** 3
- **State:** active-orchestration-foundation

## Purpose

Build a reusable event-driven automation platform for outcome-based B2B service businesses: discovery, qualification, POC generation, outreach, sales, onboarding, service delivery, reporting, retention, and expansion.

## Current baseline

Implemented in source:

- Postgres is canonical business state.
- Lead/customer lifecycle is modeled as explicit legal transitions.
- Deterministic opportunity scoring controls when expensive POC work becomes eligible.
- Durable event records carry source/confidence/payload metadata.
- State and scoring mutations write a transactional outbox record in the same PostgreSQL transaction.
- Outbox claiming uses `FOR UPDATE SKIP LOCKED`; stale `PROCESSING` claims can be requeued after a bounded recovery window.
- Outbox delivery uses HMAC-SHA256 signed webhook envelopes with a stable idempotency key and bounded exponential retry.
- Production dispatch endpoints must use HTTPS; localhost is allowed for development proof.
- Workflow result callbacks use the same HMAC scheme and a five-minute replay window.
- Workflow results are stored once per `(idempotency_key, workflow)` pair. Identical duplicates are accepted as no-ops; conflicting duplicates are rejected.
- The result-ingestion HTTP service defaults to `127.0.0.1:8787`, limits bodies to 1 MiB, exposes `/healthz`, and maps authentication/validation/conflict failures to bounded HTTP responses.
- Suppression is a first-class concept with case-insensitive lookup support.
- Initial human gates protect new campaigns, unusual contracts, and destructive/security-sensitive customer operations.

## Verified

At commit `b2e32d864ed9373b2a32517017fd3f273bfbae76`, GitHub Actions run `35274729282` passed the complete current validation path:

- dependency installation
- TypeScript compilation
- unit tests for state, scoring, migrations, webhook signing/replay protection, result validation/canonical hashing, dispatcher behavior, and signed result ingestion
- PostgreSQL migration application through `001_foundation.sql` and `002_workflow_results.sql`
- repeated migration with no reapplication
- live PostgreSQL smoke test proving state transition persistence, opportunity-score persistence, durable events, transactional outbox creation, workflow-result persistence, identical duplicate no-op handling, and conflicting duplicate rejection

The immediately preceding CI run `35274577622` correctly failed on a TypeScript request-stream type error in the new callback server; commit `b2e32d864ed9373b2a32517017fd3f273bfbae76` repaired that defect before promotion.

GitHub repository existence and write access remain verified.

## Implemented but unverified

- Live dispatch to an actual n8n instance.
- Signed callback from an actual n8n workflow into the result-ingestion service.
- Production deployment/process supervision for the dispatcher and result server.
- Apollo enrichment integration.
- Any real outbound email path.
- Any customer deployment/delivery adapter.
- Local MacBook checkout parity with the GitHub repository; GitHub/CI remains the verified source baseline for this revision.

## Pending

1. Connect one real n8n workflow and prove signed dispatch plus signed callback end to end, including duplicate delivery.
2. Select the first real service offer and define its ICP, pain detector, POC, delivery adapter, and unit economics.
3. Add Apollo enrichment adapter after credentials/configuration are available.
4. Add deliverability, consent/suppression, rate, and campaign approval controls before any real email sending.
5. Add service delivery, reporting, health scoring, churn, and expansion loops only after the initial offer is manually proven.

## Protected invariants

- No direct `DISCOVERED -> WON` state jump.
- `DO_NOT_CONTACT` is terminal.
- Suppression must be checked before outbound sends.
- POC claims must be sourced or directly measured.
- Workflow/AI components may propose state changes but canonical state belongs in the control database.
- Durable business mutations and their dispatch intent must be committed atomically through Postgres plus the outbox.
- Downstream side effects must be idempotent because outbox delivery is at-least-once.
- A callback must be authenticated before its JSON is trusted or persisted.
- A duplicate workflow result may not create a second durable result or second business side effect.
- A conflicting duplicate result must be rejected and investigated rather than silently overwriting prior evidence.

## Revision history

### Revision 3 - 2026-09-17
Added and CI-verified the signed outbox dispatcher, stale-claim recovery, bounded retry, signed workflow-result ingestion, replay protection, canonical result hashing, durable workflow-result storage, duplicate no-op behavior, conflicting-duplicate rejection, and runnable dispatcher/result-server entry points. The first CI pass exposed a request-stream TypeScript typing defect; the repair commit then passed the full build, unit, migration, idempotency, and live PostgreSQL proof path. Live n8n execution remains intentionally unverified.

### Revision 2 - 2026-09-17
Added and verified the PostgreSQL repository, ordered/idempotent migration runner, event/outbox persistence, suppression lookup path, n8n contract, and CI database proof. Two CI-discovered defects were repaired before verification: multi-statement `pg` result handling and PostgreSQL UUID/text parameter inference in outbox inserts.

### Revision 1 - 2026-09-17
Initial repository foundation created.
