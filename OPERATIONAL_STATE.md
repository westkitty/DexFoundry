# DexFoundry Operational State

- **Project ID:** dexfoundry
- **Project:** DexFoundry
- **Repository:** westkitty/DexFoundry
- **Revision:** 2
- **State:** active-persistence-foundation

## Purpose

Build a reusable event-driven automation platform for outcome-based B2B service businesses: discovery, qualification, POC generation, outreach, sales, onboarding, service delivery, reporting, retention, and expansion.

## Current baseline

Implemented in source:

- Postgres is canonical business state.
- Lead/customer lifecycle is modeled as explicit legal transitions.
- Deterministic opportunity scoring controls when expensive POC work becomes eligible.
- Durable event records carry source/confidence/payload metadata.
- State and scoring mutations write a transactional outbox record in the same PostgreSQL transaction.
- Outbox claiming uses `FOR UPDATE SKIP LOCKED`; downstream delivery is at-least-once and must be idempotent.
- Suppression is a first-class concept with case-insensitive lookup support.
- Versioned n8n workflow input/result contracts are defined, but live n8n dispatch is not yet connected.
- Initial human gates protect new campaigns, unusual contracts, and destructive/security-sensitive customer operations.

## Verified

At commit `68389ffb8a64adc09a6130e5aaf3ac376ede9ae5`, GitHub Actions run `35272877654` passed the complete current validation path:

- dependency installation
- TypeScript compilation
- 7/7 unit tests across state, scoring, and migration behavior
- PostgreSQL migration application
- repeated migration with no reapplication
- live PostgreSQL smoke test proving legal state transition persistence
- opportunity score persistence
- event creation
- transactional outbox creation

GitHub repository existence and write access remain verified.

## Implemented but unverified

- Live n8n workflow execution against the contract.
- Production outbox dispatcher process and authenticated callback/API boundary.
- Apollo enrichment integration.
- Any real outbound email path.
- Any customer deployment/delivery adapter.
- Local MacBook checkout parity with the GitHub repository; GitHub/CI is the verified source baseline for this revision.

## Pending

1. Implement the bounded outbox dispatcher and authenticated workflow-result ingestion boundary.
2. Connect a real n8n workflow and prove idempotent duplicate delivery handling.
3. Select the first real service offer and define its ICP, pain detector, POC, delivery adapter, and unit economics.
4. Add Apollo enrichment adapter after credentials/configuration are available.
5. Add deliverability, consent/suppression, rate, and campaign approval controls before any real email sending.
6. Add service delivery, reporting, health scoring, churn, and expansion loops only after the initial offer is manually proven.

## Protected invariants

- No direct `DISCOVERED -> WON` state jump.
- `DO_NOT_CONTACT` is terminal.
- Suppression must be checked before outbound sends.
- POC claims must be sourced or directly measured.
- Workflow/AI components may propose state changes but canonical state belongs in the control database.
- Durable business mutations and their dispatch intent must be committed atomically through Postgres plus the outbox.
- Downstream side effects must be idempotent because outbox delivery is at-least-once.

## Revision history

### Revision 2 - 2026-09-17
Added and verified the PostgreSQL repository, ordered/idempotent migration runner, event/outbox persistence, suppression lookup path, n8n contract, and CI database proof. Two CI-discovered defects were repaired before verification: multi-statement `pg` result handling and PostgreSQL UUID/text parameter inference in outbox inserts.

### Revision 1 - 2026-09-17
Initial repository foundation created.
