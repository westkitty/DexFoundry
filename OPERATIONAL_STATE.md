# DexFoundry Operational State

- **Project ID:** dexfoundry
- **Project:** DexFoundry
- **Repository:** westkitty/DexFoundry
- **Revision:** 1
- **State:** active-foundation

## Purpose

Build a reusable event-driven automation platform for outcome-based B2B service businesses: discovery, qualification, POC generation, outreach, sales, onboarding, service delivery, reporting, retention, and expansion.

## Current baseline

Implemented in source:

- Postgres is intended as canonical business state.
- Lead/customer lifecycle is modeled as explicit legal transitions.
- Deterministic opportunity scoring controls when expensive POC work becomes eligible.
- Event records carry source/confidence/payload metadata.
- Suppression is a first-class concept.
- Initial human gates protect new campaigns, unusual contracts, and destructive/security-sensitive customer operations.

## Verified

- GitHub repository exists and is writable.
- Core source, schema, tests, configuration scaffold, and architecture documentation are present in the repository.

## Implemented but unverified

- TypeScript compilation.
- Unit test execution.
- Local dependency installation.

The MacBook execution node dropped offline during validation, so these checks remain explicitly unverified.

## Pending

1. Reconnect the MacBook node and run `npm install && npm run check`.
2. Add Postgres repository implementation and migrations runner.
3. Add n8n workflow contracts.
4. Add Apollo enrichment adapter after credentials/configuration are available.
5. Select the first real service offer and define its ICP, pain detector, POC, delivery adapter, and unit economics.
6. Add outbound deliverability controls before any real email sending.

## Protected invariants

- No direct `DISCOVERED -> WON` state jump.
- `DO_NOT_CONTACT` is terminal.
- Suppression must be checked before outbound sends.
- POC claims must be sourced or directly measured.
- Workflow/AI components may propose state changes but canonical state belongs in the control database.

## Revision history

### Revision 1 - 2026-09-17
Initial repository foundation created.
