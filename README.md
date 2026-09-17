# DexFoundry

**An autonomous B2B service operations engine.**

DexFoundry finds companies showing a real pain signal, qualifies them deterministically, builds evidence-backed proof, coordinates outreach, and ultimately manages onboarding, delivery, reporting, retention, and expansion.

The customer buys an outcome. DexFoundry operates the machinery behind it.

## Principles

- Postgres owns reality; workflow tools do not.
- Every company has an explicit state.
- Every consequential state transition creates evidence.
- Expensive work happens late in the funnel.
- POC claims must be sourced or directly measured.
- `DO_NOT_CONTACT` is terminal.
- Automation earns autonomy through evidence; risky edges remain approval-gated.

## Current foundation

- Deterministic acquisition/customer state machine.
- Deterministic opportunity scoring.
- Transactional PostgreSQL repository.
- Ordered, idempotent SQL migrations with an advisory lock.
- Durable event ledger and transactional outbox.
- Suppression data model and lookup gate.
- Versioned n8n workflow envelopes/results.
- CI with PostgreSQL migration and persistence smoke proof.
- Offer configuration scaffold.

## Development

```bash
npm install
npm run check
```

Database validation:

```bash
export DATABASE_URL='postgresql://user:password@localhost:5432/dexfoundry'
npm run build
npm run db:migrate
npm run db:smoke
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/N8N_CONTRACT.md`](docs/N8N_CONTRACT.md), and [`OPERATIONAL_STATE.md`](OPERATIONAL_STATE.md).
