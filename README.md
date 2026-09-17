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
- Event-ledger contract.
- Initial PostgreSQL schema.
- Suppression data model.
- Offer configuration scaffold.
- Unit tests for protected transition/scoring behavior.

## Development

```bash
npm install
npm run check
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`OPERATIONAL_STATE.md`](OPERATIONAL_STATE.md).
