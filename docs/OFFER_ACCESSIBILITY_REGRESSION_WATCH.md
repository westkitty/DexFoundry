# Offer Hypothesis: Accessibility Regression Watch

Status: **manual proof required**

## Product promise

Continuously detect machine-observable accessibility regressions on a bounded set of public website pages, preserve evidence, prioritize changes, and produce a concise client-facing regression report.

This service does **not** promise legal compliance, certify WCAG conformance, replace expert manual accessibility evaluation, or provide legal advice.

## Initial ICP

Primary ICP: web/digital agencies that maintain multiple public client websites and already sell recurring website maintenance.

Secondary ICPs for later validation:

- vendors maintaining public-sector websites
- organizations with multi-site web portfolios
- ecommerce operators with frequent production changes

## Observable pain signals

DexFoundry may use only public, non-intrusive evidence for the pre-sales proof:

- machine-detectable accessibility errors on sampled public pages
- repeated rule failures across multiple pages
- severe/critical automated findings when the selected scanner provides impact metadata
- recent redesign/CMS migration only when supported by evidence or explicit enrichment data
- accessibility/QA/web-maintenance hiring only when supported by enrichment evidence

Absence of an automated finding is not evidence that a page is accessible or conformant.

## POC

The pre-sales POC is a bounded automated snapshot of at most three public pages by default.

It must include:

1. pages sampled
2. timestamped scan evidence
3. counts of observed automated findings
4. a small number of representative issue records with rule IDs/selectors when available
5. explicit automated-only / non-conformance disclaimer
6. no invented ROI, legal exposure, damages, or compliance status

Every evidence-bearing claim must pass `assertGroundedPoc`.

## Recurring service

If manually proven and sold, the recurring service hypothesis is:

- scheduled scans of an agreed page inventory
- baseline-to-current regression comparison
- alerts for newly introduced findings
- evidence history per URL/rule
- weekly or monthly client report
- human-review queue for issues automated scanners cannot resolve

## Manual proof gate

Do not enable automated prospect outreach for this offer yet.

Minimum evidence before automation expansion:

1. Run the audit manually on at least five representative public sites from the target ICP.
2. Confirm results are stable enough to reproduce and explain.
3. Produce at least three POCs manually from real public evidence.
4. Have at least one real prospective buyer or agency operator evaluate whether the POC is understandable and useful.
5. Attempt a manual sale before treating pricing, response rates, or willingness-to-pay as known.
6. Record false positives, scan instability, blocked pages, and cases requiring human judgment.

Only after this evidence exists should DexFoundry automate discovery, lead enrichment, POC generation, or outreach for this offer.

## Initial technical boundary

The adapter is scanner-agnostic through `AccessibilityScanProvider`.

Likely scanner implementations can use Pa11y and/or axe-core later, but the offer contract must not depend on one scanner's output schema. The first implementation therefore consumes normalized findings rather than shelling out to a scanner directly.

## Success criteria for the next slice

- adapter compiles
- deterministic unit tests pass
- POC claims are evidence-grounded
- clean scans do not fabricate a visible problem
- high-severity signals derive from observed findings, not marketing claims
- existing orchestration and database proof remain green
- offer remains explicitly `manual-proof-required`
