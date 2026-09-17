# Accessibility Regression Watch — Code and Theory

**Observed:** September 17, 2026  
**Public page sampled:** https://www.codeandtheory.com/  
**Scope:** one automated public-page snapshot, followed by a repeat scan roughly two minutes later

## What we observed

The first scan recorded **5 error-level** and **38 warning-level** machine-detectable findings. The immediate repeat produced the same error count and warning count, and the retained error signatures were stable across both runs.

Representative issue classes from the sampled page included:

- a form without a submit control that can be activated through normal keyboard submission
- a fieldset without an accessible name / legend
- a button without an accessible name
- a color-contrast failure on the sampled interface.

These are scanner observations, not a determination that the site conforms or fails to conform to WCAG, the ADA, or any other legal standard. Automated testing cannot establish complete accessibility on its own.

## Why this is more useful as a regression service than a one-time scan

A one-time issue list is easy to produce. The useful part is knowing what changed after releases.

Accessibility Regression Watch keeps a compact fingerprint of machine-detectable findings on agreed pages, then classifies later scans as:

- **NEW** — a finding signature appeared after the baseline
- **PERSISTING** — the same finding signature remains
- **RESOLVED** — a prior finding signature disappeared.

That creates a release-oriented accessibility signal instead of another static audit export.

## 30-day pilot

**$750 flat pilot**

Scope:

- up to **3 public websites**
- up to **3 agreed public pages per site**
- baseline scan plus **weekly rescans** for 30 days
- human-triaged representative findings rather than raw scanner-count dumping
- NEW / PERSISTING / RESOLVED change summaries
- one concise final regression report suitable for an engineering or client-services review.

Not included: remediation work, legal advice, certification, VPAT/ACR work, or claims of WCAG conformance.

If the pilot is not useful enough to justify recurring monitoring, it stops there. Ongoing scope and price would be based on the actual review burden observed during the pilot rather than guessed in advance.
