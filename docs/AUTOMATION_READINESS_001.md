# Accessibility Regression Watch — Automation Readiness 001

**Date:** 2026-09-17  
**Verdict:** **BLOCKED for prospecting/outreach/customer-delivery automation**  
**Narrow allowed scope:** bounded scanner, evidence capture, baseline/delta comparison, and manually reviewed POC preparation.

## Procedure under review

Accessibility Regression Watch scans explicitly selected public HTTP(S) pages with the pinned Pa11y provider, normalizes machine-detectable accessibility findings into evidence, and drafts a bounded POC that explicitly does not claim WCAG conformance or legal compliance.

## Evidence reviewed

### Controlled runtime proof

GitHub Actions run `35284098870` proved the Pa11y browser-backed scanner path on a controlled local fixture while preserving the existing Postgres and signed n8n orchestration invariants.

### Representative public-site batch

Workflow run `35284702132`, attempt 1, scanned five representative agency home pages:

- Work & Co
- Instrument
- Code and Theory
- R/GA
- Huge

Result: **5/5 scanned, 0 blocked**. Every generated POC retained `conformanceDetermination: false`.

Attempt 1 counts:

| Candidate | Errors | Warnings |
|---|---:|---:|
| Work & Co | 15 | 27 |
| Instrument | 14 | 60 |
| Code and Theory | 5 | 38 |
| R/GA | 25 | 45 |
| Huge | 43 | 41 |

### Immediate repeat run

The same workflow was rerun as attempt 2 against the same five URLs.

Result: **5/5 scanned again, 0 blocked**.

- Error counts were identical on all five sites.
- Warning counts were identical on four sites.
- Huge changed from 41 to 42 warnings.
- The five retained error signatures on every candidate were identical between attempts when compared as `rule code + selector`.

This is strong short-interval repeatability evidence for the bounded sample. It is not yet a long-term stability claim.

## Human-review findings

The first public-site batch exposed a product-quality issue that raw scan success alone would have missed:

- some candidates contain many repeated color-contrast findings;
- a raw count such as “43 errors” can exaggerate buyer-perceived breadth when many findings are instances of the same rule class;
- third-party widgets can contribute findings that are real scanner observations but weak prospect-facing evidence.

The best initial buyer-facing examples from this batch are:

1. **Code and Theory** — diverse form, keyboard/submission, fieldset, legend, button-name, and contrast findings.
2. **Instrument** — varied ARIA naming/attribute findings plus contrast.
3. **Work & Co** — usable mixed findings, but some evidence is tied to an embedded/third-party experience.

R/GA and Huge are weaker POC examples in the current format because repeated contrast findings dominate the first-page evidence.

DexFoundry was therefore changed to prefer one representative error per rule class in prospect-facing evidence while retaining compact fingerprints for the complete finding set.

## New regression primitive

Offer version `0.2.0-manual-proof` now retains compact full-scan finding fingerprints in summary evidence and exposes `compareAccessibilityEvidence()`.

The comparison classifies comparable-page signatures as:

- **NEW**
- **PERSISTING**
- **RESOLVED**

This enables regression semantics without flooding the POC with every raw issue instance.

GitHub Actions run `35285145052` at commit `cf1950c8623d6c9a6abdf50fd5f09ecb5a3b3831` passed:

- TypeScript build and expanded unit suite;
- browser-backed accessibility fixture proof;
- all Postgres migrations and persistence/idempotency proof;
- pinned n8n preparation;
- live signed dispatch/callback;
- duplicate-delivery proof;
- clean teardown.

## Gate assessment

| Gate | State | Evidence |
|---|---|---|
| Scanner runs on representative public sites | PASS | 5/5 completed twice |
| No prospect-specific engineering required | PASS for sampled pages | Same bounded path worked across five sites |
| Short-interval repeatability | PASS | identical error counts; near-identical warnings; retained signatures stable |
| Non-conformance/legal guard | PASS | all generated POCs preserved guard |
| Full finding-delta capability | PASS in software | complete compact fingerprints + delta comparator now exist |
| False-positive/noise burden | PARTIAL | repetitive contrast/third-party noise observed; representative-rule repair applied |
| Three externally useful POCs | NOT PROVEN | internal review selected three candidates, but no target buyer has reviewed them |
| Human review minutes / service margin | UNKNOWN | not yet measured in an actual service pass |
| Buyer understands recurring value | UNKNOWN | no target buyer evidence yet |
| Willingness to pay | UNKNOWN | no pricing conversation/pilot evidence |
| Manual sale or paid pilot | NOT DONE | required before sales automation |
| Apollo/discovery automation | BLOCKED | commercial proof missing |
| Cold outreach automation | BLOCKED | commercial proof + outbound safety proof missing |
| Customer delivery automation | BLOCKED | service delivery not manually proven |

## Decision

**Do not automate prospect discovery, Apollo enrichment, cold outreach, proposal/payment, or customer delivery for this offer yet.**

The narrow next phase is:

1. prepare three manually reviewed buyer-facing POCs from the strongest evidence;
2. record review time and any noise removed;
3. show at least one to a real target buyer/operator;
4. ask for a pilot with an explicit price;
5. record objections and workload;
6. rerun this gate.

The purpose of this block is to prevent DexFoundry from automating a technically functioning scanner before proving that anyone values the service enough to buy it.
