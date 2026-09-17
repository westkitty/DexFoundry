# Accessibility Regression Watch — Work & Co

**Observed:** September 17, 2026  
**Public page sampled:** https://work.co/  
**Scope:** one automated public-page snapshot, followed by a repeat scan roughly two minutes later

## What we observed

The first scan recorded **15 error-level** and **27 warning-level** machine-detectable findings. The immediate repeat produced the same error count and warning count, and the retained error signatures were stable across both runs.

Representative issue classes from the sampled page included:

- links in text blocks that were flagged as relying on color for distinction
- a color-contrast failure in the cookie-policy interface
- embedded-media frame findings that require human confirmation before they should be presented as buyer-facing defects.

The embedded-media findings are intentionally not used here as a firm claim. Third-party widgets and frames can create scanner noise, so they belong in the human-review queue unless independently confirmed.

These are scanner observations, not a determination that the site conforms or fails to conform to WCAG, the ADA, or any other legal standard. Automated testing cannot establish complete accessibility on its own.

## Why this is more useful as a regression service than a one-time scan

A raw scanner can tell you what it sees today. A regression service tells you what changed.

Accessibility Regression Watch fingerprints machine-detectable findings on agreed pages and classifies later scans as:

- **NEW** — newly observed since baseline
- **PERSISTING** — still present
- **RESOLVED** — no longer detected.

Human triage stays between raw scanner output and anything presented to a client.

## 30-day pilot

**$750 flat pilot**

Scope:

- up to **3 public websites**
- up to **3 agreed public pages per site**
- baseline scan plus **weekly rescans** for 30 days
- human triage of third-party / ambiguous findings
- NEW / PERSISTING / RESOLVED change summaries
- one concise final regression report suitable for an engineering or client-services review.

Not included: remediation work, legal advice, certification, VPAT/ACR work, or claims of WCAG conformance.

If the pilot does not produce a useful recurring signal, it stops after the pilot. Ongoing scope and price would be based on the actual review burden observed.
