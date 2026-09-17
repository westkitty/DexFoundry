# Accessibility Regression Watch — Instrument

**Observed:** September 17, 2026  
**Public page sampled:** https://www.instrument.com/  
**Scope:** one automated public-page snapshot, followed by a repeat scan roughly two minutes later

## What we observed

The first scan recorded **14 error-level** and **60 warning-level** machine-detectable findings. The immediate repeat produced the same error count and warning count, with the retained error signatures stable across both runs.

Representative issue classes from the sampled page included:

- a dialog without an accessible name
- ARIA attributes used on elements where those attributes are not permitted
- a color-contrast failure in the sampled navigation experience.

Repeated instances of the same ARIA rule were deliberately collapsed in this summary. The point is to show distinct actionable classes, not inflate the headline number.

These are scanner observations, not a determination that the site conforms or fails to conform to WCAG, the ADA, or any other legal standard. Automated testing cannot establish complete accessibility on its own.

## Why this is more useful as a regression service than a one-time scan

The value is not another static issue list. It is knowing when machine-detectable accessibility behavior changes across releases and client properties.

Accessibility Regression Watch keeps compact finding fingerprints and reports:

- **NEW** findings introduced since baseline
- **PERSISTING** findings still present
- **RESOLVED** findings no longer detected.

That gives product and engineering teams a small recurring signal they can review alongside normal release work.

## 30-day pilot

**$750 flat pilot**

Scope:

- up to **3 public websites**
- up to **3 agreed public pages per site**
- baseline scan plus **weekly rescans** for 30 days
- human-triaged representative findings rather than repetitive raw output
- NEW / PERSISTING / RESOLVED change summaries
- one concise final regression report suitable for an engineering or client-services review.

Not included: remediation work, legal advice, certification, VPAT/ACR work, or claims of WCAG conformance.

If the pilot does not produce a useful recurring signal, it ends after 30 days. Ongoing scope and price would be set from the real workload observed during the pilot.
