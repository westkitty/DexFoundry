# Accessibility Regression Watch — Internal Service Simulation

## Purpose

This workflow exercises the delivery/reporting side of Accessibility Regression Watch without contacting a prospect or customer.

It turns two stored accessibility evidence sets into:

- NEW / PERSISTING / RESOLVED regression counts;
- a bounded internal change classification;
- explicit human-review workload input;
- an input-based direct-cost and contribution model.

It does **not** send a message, publish a report, create a contact, alter suppression state, or change outbound mode.

## Why review time is explicit

DexFoundry must not manufacture service-margin evidence from AI-assisted work.

The simulator therefore requires review minutes as an explicit input and requires the caller to label those minutes as either:

- `fixture` — synthetic/test timing; or
- `operator-measured` — timing actually measured during a human review pass.

Even with operator-measured review time, the output remains modeled economics. It is not realized profit, buyer demand, conversion evidence, or proof that the $750 pilot price will sell.

## Input

Use two JSON files containing either:

- the `evidence` array from a manual proof; or
- a full `a11y:manual-proof` JSON result containing an `evidence` field.

The two evidence sets must include at least one matching sampled page.

## Run

After build:

```sh
npm run a11y:simulate-service -- \
  --baseline baseline.json \
  --current current.json \
  --review-minutes 30 \
  --review-source fixture \
  --labor-hourly 80 \
  --tool-cost 10 \
  --pilot-price 750
```

For a real internal timing pass, replace `fixture` with `operator-measured` only when the minutes were actually measured.

## Output locks

Every generated report is intentionally marked:

- `simulation: true`
- `externalDeliveryAllowed: false`
- `requiresHumanReview: true`
- `conformanceDetermination: false`

The report may be used to refine internal delivery mechanics and cost assumptions. It is not authorized for prospect/customer delivery and cannot override the global outbound control.

## Economic interpretation

The simulator calculates:

- modeled labor cost from supplied review minutes × supplied hourly labor cost;
- supplied tool cost;
- modeled total direct cost;
- modeled contribution against the supplied pilot price;
- modeled contribution margin in basis points.

This is deliberately narrower than accounting profit or gross margin. It excludes acquisition cost, overhead, taxes, failed scans, support burden, remediation labor, customer-specific complexity, and unpaid sales time unless the operator explicitly incorporates those costs into the inputs.

## Next evidence target

Run one complete internal service pass with measured human review time. Record:

1. total pages reviewed;
2. total review minutes;
3. scanner noise removed;
4. findings escalated for judgment;
5. final report-edit time;
6. any failed or blocked scan work;
7. explicit direct tool cost.

Only then should DexFoundry use `operator-measured` timing to model service economics.
