# DexFoundry Architecture

DexFoundry is an event-driven operating system for outcome-based B2B services.

## Control plane

- **Postgres** is the source of truth.
- **The state machine** controls which actions are legal.
- **The event ledger** records why state changed.
- **Workflow adapters** such as n8n execute bounded jobs; they do not own canonical state.

## Core loop

`discover -> detect pain -> score -> enrich -> prove -> approve -> outreach -> close -> onboard -> operate -> measure -> retain`

## Safety boundaries

The following begin human-gated:

1. New ICP or targeting logic.
2. New proof-of-concept format.
3. New outbound campaign.
4. Non-standard contracts.
5. Destructive or security-sensitive customer operations.

`DO_NOT_CONTACT` is terminal. Suppression checks must precede every outbound send.

## Adapter roadmap

1. Postgres persistence layer.
2. n8n workflow adapter.
3. Apollo enrichment adapter.
4. Evidence collector and POC generator.
5. Email sending and reply classifier.
6. Customer deployment adapter.
7. Value reporting, health, churn, and expansion loops.
