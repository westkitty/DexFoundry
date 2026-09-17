# DexFoundry Architecture

DexFoundry is an event-driven operating system for outcome-based B2B services.

## Control plane

- **Postgres** is the source of truth.
- **The state machine** controls which actions are legal.
- **The event ledger** records why state changed.
- **The transactional outbox** couples durable state/event changes to downstream workflow dispatch without requiring a distributed transaction.
- **Workflow adapters** such as n8n execute bounded jobs; they do not own canonical state.

## Core loop

`discover -> detect pain -> score -> enrich -> prove -> approve -> outreach -> close -> onboard -> operate -> measure -> retain`

## Dispatch model

A state or scoring mutation writes its durable event and outbox message in the same PostgreSQL transaction. Workers claim pending outbox rows with `FOR UPDATE SKIP LOCKED`, dispatch them to orchestration adapters, then mark them published. Failed deliveries return to pending with bounded retry delay.

Delivery is at least once. External workflows must therefore use the provided `idempotencyKey` before irreversible side effects.

## Safety boundaries

The following begin human-gated:

1. New ICP or targeting logic.
2. New proof-of-concept format.
3. New outbound campaign.
4. Non-standard contracts.
5. Destructive or security-sensitive customer operations.

`DO_NOT_CONTACT` is terminal. Suppression checks must precede every outbound send.

## Adapter roadmap

1. **Implemented:** Postgres persistence layer, migrations, event ledger, outbox.
2. **Contracted:** n8n workflow boundary and idempotency rules.
3. Apollo enrichment adapter.
4. Evidence collector and POC generator.
5. Email sending and reply classifier.
6. Customer deployment adapter.
7. Value reporting, health, churn, and expansion loops.
