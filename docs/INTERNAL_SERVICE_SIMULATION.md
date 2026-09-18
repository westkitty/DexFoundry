# Accessibility Regression Watch — Internal Service Simulation

## Purpose

This workflow exercises the delivery/reporting side of Accessibility Regression Watch without contacting a prospect or customer.

It turns two stored accessibility evidence sets into NEW / PERSISTING / RESOLVED regression counts, an internal change classification, measured-or-fixture review workload evidence, and an input-based direct-cost/contribution model.

It does **not** send a message, publish a report, create a contact, alter suppression state, or change outbound mode.

## Operator measurement contract

DexFoundry must not manufacture service-margin evidence from AI-assisted work or hand-entered guesses.

A real measured pass starts an operator review session before review begins and finishes it after the review/report pass ends. The completed record captures wall-clock start/end, paused minutes, derived active review minutes, pages reviewed, scanner noise removed, judgment escalations, report-edit minutes, failed/blocked scans, direct tool cost, and optional notes.

Derived elapsed/active minutes are recomputed when the record is loaded. Tampered or impossible timing is rejected.

## Start a measured internal review

```sh
npm run a11y:review-session -- start --output review-session.json
```

This creates an `IN_PROGRESS` record without overwriting an existing file.

## Finish the measured internal review

```sh
npm run a11y:review-session -- finish \
  --session review-session.json \
  --pages-reviewed 3 \
  --noise-removed 4 \
  --judgment-escalations 2 \
  --report-edit-minutes 10 \
  --failed-or-blocked-scans 0 \
  --paused-minutes 5 \
  --direct-tool-cost 0 \
  --note "Internal review only"
```

The session is then `COMPLETE` and can be used as measured workload evidence.

## Build a report from a completed review session

```sh
npm run a11y:simulate-service -- \
  --baseline baseline.json \
  --current current.json \
  --review-session review-session.json \
  --labor-hourly 80 \
  --pilot-price 750
```

When `--review-session` is used, DexFoundry takes active review minutes and direct tool cost from the completed session. It rejects attempts to combine that session with hand-entered `--review-minutes`, `--review-source`, or `--tool-cost`.

## Fixture-only simulation

Hand-entered review minutes remain allowed only with `--review-source fixture`. Operator-measured economics require a completed review-session record.

## Output locks

Every generated report remains `simulation: true`, `externalDeliveryAllowed: false`, `requiresHumanReview: true`, and `conformanceDetermination: false`.

A completed operator session upgrades only the **review-time evidence**. It does not validate buyer demand, pricing, close rate, realized profit, or commercial viability.

## Next evidence target

Run one genuine complete internal service pass using the start/finish session workflow. The resulting measured session can then be fed to the simulator without converting guesses into evidence.
