# Accessibility Regression Watch — Manual Proof Protocol

**Commercial state:** `manual-proof-required`

This protocol is the evidence gate before DexFoundry may automate prospect discovery, enrichment, prospect POC generation, or outbound outreach for Accessibility Regression Watch.

## Privacy and publication boundary

Raw third-party scan output, screenshots, buyer identities, contact notes, and site-specific POCs belong under `manual-proof/private/`, which is intentionally ignored by Git.

Do not publish a prospect defect list to the public repository. The public repository may retain methodology, aggregate observations, generalized failure modes, and evidence that the gate was or was not satisfied.

## Candidate selection

Select five organizations that plausibly match the primary ICP: web/digital agencies that maintain multiple public websites, especially public-sector or accessibility-sensitive portfolios.

Selection must be explicit and human-reviewed. Do not automate discovery during this phase.

For each candidate record privately:

- organization and public URL;
- why it matches the ICP;
- which 1–3 public pages were explicitly selected;
- whether robots/rate/technical behavior makes the scan inappropriate;
- scan date/time and runtime;
- raw evidence file path;
- analyst notes.

## Scan procedure

Build first, then run the bounded CLI only against explicitly selected public HTTP(S) URLs:

```bash
npm install
npm run build
mkdir -p manual-proof/private
npm run --silent a11y:manual-proof -- --name "Candidate 01" https://example.com/ > manual-proof/private/candidate-01-run-1.json
```

Repeat the same scan after a short interval without changing configuration:

```bash
npm run --silent a11y:manual-proof -- --name "Candidate 01" https://example.com/ > manual-proof/private/candidate-01-run-2.json
```

Maximum three pages per candidate in this phase. Do not authenticate, bypass controls, enumerate hidden routes, or expand into undisclosed crawling.

## Per-candidate review

Review both runs manually and record:

- did the scan complete without intervention? `YES/NO`;
- runtime for each run;
- number of error-level findings;
- number of warning-level findings;
- finding signatures stable across both runs;
- findings that disappeared/appeared without a known site change;
- blocked or flaky pages;
- obvious duplicates/noise;
- strongest 1–3 findings a buyer could understand quickly;
- whether the generated POC is understandable in under 30 seconds;
- whether any wording overstates what automation establishes;
- approximate human review minutes.

## Aggregate technical gate

After five candidates, summarize privately and publish only aggregate/non-identifying conclusions.

The scanner path is suitable for further commercial proof only if:

- at least 4/5 candidate scans complete without special-case engineering;
- repeated runs show enough stable findings to support regression comparison;
- the POC remains evidence-grounded and preserves the non-conformance disclaimer in every run;
- human review burden is low enough that a paid recurring service could plausibly retain margin;
- no recurring failure mode requires intrusive access or prospect-specific engineering.

These thresholds are provisional experiment criteria, not market facts. If they fail, revise the scanner/offer and repeat the technical proof rather than weakening the threshold after seeing results.

## POC proof gate

Select at least three of the five candidates for a manually reviewed POC. A POC passes only if:

- every factual claim maps to captured evidence;
- the most important finding can be understood quickly;
- it says what was sampled;
- it does not claim WCAG conformance/non-conformance for the whole site;
- it does not provide legal advice or assert damages/exposure;
- it explains the recurring value: catching new/regressed/resolved machine-detectable issues after site changes.

## Buyer proof gate

Before prospecting automation is allowed:

1. At least one real target buyer/operator must review the POC or an equivalent manually prepared example.
2. Record whether they understand the problem, care about recurrence, and can identify who would own/pay for it.
3. Attempt at least one manual sale or paid pilot.
4. Record the proposed price, objections, decision outcome, human work required, and any requested deliverables.

One positive reaction is not proof of product-market fit. It is the minimum evidence needed to decide whether automating the sales motion is justified.

## Automation decision

After the five-site, three-POC, and buyer/sale evidence exists, re-run the manual-proof-to-automation gate.

Until that gate passes, keep these disabled:

- automated prospect discovery;
- bulk/mass public-site scanning;
- Apollo enrichment for this offer;
- automated personalized POC generation at prospect scale;
- cold-email sending and follow-ups;
- autonomous proposal/payment/onboarding.

A failed gate is useful evidence. Do not automate around it.
