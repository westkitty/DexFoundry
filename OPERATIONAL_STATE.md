# DexFoundry Operational State

- **Project ID:** dexfoundry
- **Project:** DexFoundry
- **Repository:** westkitty/DexFoundry
- **Revision:** 4
- **State:** active-live-orchestration-proof

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
- Production dispatch endpoints must use HTTPS; localhost is allowed for bounded development/CI proof.
- Workflow result callbacks use the same HMAC scheme and a five-minute replay window.
- Workflow results are stored once per `(idempotency_key, workflow)` pair. Identical redeliveries increment `delivery_count` without creating a second result; conflicting duplicates are rejected.
- The result-ingestion HTTP service defaults to `127.0.0.1:8787`, limits bodies to 1 MiB, exposes `/healthz`, and maps authentication/validation/conflict failures to bounded HTTP responses.
- An importable n8n proof workflow verifies DexFoundry request signatures, validates replay/idempotency fields, and returns a signed result callback.
- A generic `OfferAdapter` contract defines pain detection, evidence, POC construction, and optional delivery without granting adapters authority over canonical state.
- `assertGroundedPoc` rejects POC claims without evidence and references to unknown evidence IDs.
- Suppression is a first-class concept with case-insensitive lookup support.
- Initial human gates protect new campaigns, unusual contracts, and destructive/security-sensitive customer operations.

## Verified

At commit `6cd74c639ef96dff043c41425dff634fd95bac29`, GitHub Actions run `35277855045` passed the complete current validation path:

- Node 24 dependency installation and TypeScript compilation
- **21/21 unit tests across 8 test files** covering state, scoring, migrations, dispatcher behavior, HMAC signing/replay protection, signed result ingestion, workflow-result hashing, and offer evidence grounding
- PostgreSQL migrations `001_foundation.sql`, `002_workflow_results.sql`, and `003_workflow_delivery_receipts.sql`
- repeated migration with no reapplication
- live PostgreSQL smoke proof of state, score, event, outbox, result persistence, duplicate-delivery accounting, and conflicting-result rejection
- official pinned `docker.n8n.io/n8nio/n8n:2.39.7` image pulled in disposable GitHub CI
- fresh n8n instance initialized, proof workflow imported, and workflow published
- production webhook registration verified before dispatch
- real signed DexFoundry outbox event delivered over HTTP to the running n8n workflow
- n8n verified the inbound HMAC/replay/idempotency contract and returned a signed callback to the live DexFoundry result receiver
- first delivery reached `PUBLISHED` with no release
- the same event was deliberately requeued and delivered a second time
- second delivery also reached `PUBLISHED`
- final proof confirmed one durable workflow result, `delivery_count = 2`, and two outbox delivery attempts
- disposable n8n container and volume were cleaned up after proof

The live-proof path exposed and repaired several integration defects before promotion: GitHub Actions env scalar validation, n8n 2.39.7 requiring Node 24, insufficient first-delivery error visibility, and readiness checking `/healthz` before the production webhook route was registered. The final CI path gates on the actual production webhook route.

GitHub repository existence and write access remain verified.

## Implemented but unverified

- Long-running/production n8n deployment and process supervision outside disposable CI.
- Production secret rotation and deployment-specific secret storage.
- Apollo enrichment integration.
- Any real outbound email path.
- Any concrete customer service/delivery adapter.
- A real business offer using the generic `OfferAdapter` contract.
- Local MacBook checkout parity with the GitHub repository; GitHub/CI remains the verified source baseline for this revision.

## Pending

1. Define and implement the first real service offer: ICP, observable pain signals, evidence collector, POC format, delivery adapter, and unit economics.
2. Add Apollo enrichment after credentials/configuration are available.
3. Add deliverability, suppression, rate, and campaign approval controls before any real outbound email is enabled.
4. Add production deployment/process supervision for DexFoundry and n8n only when an actual service environment is selected.
5. Add service reporting, health scoring, churn, and expansion loops after the initial offer is manually proven.

## Protected invariants

- No direct `DISCOVERED -> WON` state jump.
- `DO_NOT_CONTACT` is terminal.
- Suppression must be checked before outbound sends.
- POC claims must be sourced or directly measured.
- Workflow/AI components and offer adapters may propose work but canonical state belongs in the control database.
- Durable business mutations and their dispatch intent must be committed atomically through Postgres plus the outbox.
- Downstream side effects must be idempotent because outbox delivery is at-least-once.
- A callback must be authenticated before its JSON is trusted or persisted.
- A duplicate workflow result may not create a second durable result or second business side effect.
- A conflicting duplicate result must be rejected and investigated rather than silently overwriting prior evidence.
- An offer POC may not contain an evidence-bearing claim whose evidence IDs are empty or unresolved.
- CI-only Docker use for disposable integration proof does not establish Docker as a local development or production requirement.

## Revision history

### Revision 4 - 2026-09-17
Added migration 003 for duplicate-delivery receipts, the generic evidence-grounded `OfferAdapter` contract, and an importable signed n8n proof workflow. Reworked CI to Node 24 and a pinned official n8n 2.39.7 container after the earlier CLI path exposed runtime/bootstrap noise. GitHub Actions run `35277855045` then proved the real production-webhook path end to end: signed DexFoundry dispatch -> n8n verification -> signed callback -> durable result, followed by deliberate duplicate redelivery yielding one result with `delivery_count = 2`. Local development remains Docker-free.

### Revision 3 - 2026-09-17
Added and CI-verified the signed outbox dispatcher, stale-claim recovery, bounded retry, signed workflow-result ingestion, replay protection, canonical result hashing, durable workflow-result storage, duplicate no-op behavior, conflicting-duplicate rejection, and runnable dispatcher/result-server entry points. The first CI pass exposed a request-stream TypeScript typing defect; the repair commit then passed the full build, unit, migration, idempotency, and live PostgreSQL proof path. Live n8n execution remained intentionally unverified at this revision.

### Revision 2 - 2026-09-17
Added and verified the PostgreSQL repository, ordered/idempotent migration runner, event/outbox persistence, suppression lookup path, n8n contract, and CI database proof. Two CI-discovered defects were repaired before verification: multi-statement `pg` result handling and PostgreSQL UUID/text parameter inference in outbox inserts.

### Revision 1 - 2026-09-17
Initial repository foundation created.
