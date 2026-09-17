# DexFoundry Operational State

- **Project ID:** dexfoundry
- **Project:** DexFoundry
- **Repository:** westkitty/DexFoundry
- **Revision:** 6
- **State:** active-first-offer-manual-proof

## Purpose

Build a reusable event-driven automation platform for outcome-based B2B service businesses: discovery, qualification, POC generation, outreach, sales, onboarding, service delivery, reporting, retention, and expansion.

## Current baseline

Implemented in source:

- Postgres is canonical business state.
- Lead/customer lifecycle is modeled as explicit legal transitions.
- Deterministic opportunity scoring controls when expensive POC work becomes eligible.
- Durable event records carry source/confidence/payload metadata.
- State and scoring mutations write a transactional outbox record in the same PostgreSQL transaction.
- Outbox claiming uses `FOR UPDATE SKIP LOCKED`; stale `PROCESSING` claims can be requeued after a bounded recovery window.
- Outbox delivery uses HMAC-SHA256 signed webhook envelopes with a stable idempotency key and bounded exponential retry.
- Production dispatch endpoints must use HTTPS; localhost is allowed for bounded development/CI proof.
- Workflow result callbacks use the same HMAC scheme and a five-minute replay window.
- Workflow results are stored once per `(idempotency_key, workflow)` pair. Identical redeliveries increment `delivery_count` without creating a second result; conflicting duplicates are rejected.
- The result-ingestion HTTP service defaults to `127.0.0.1:8787`, limits bodies to 1 MiB, exposes `/healthz`, and maps authentication/validation/conflict failures to bounded HTTP responses.
- An importable n8n proof workflow verifies DexFoundry request signatures, validates replay/idempotency fields, and returns a signed result callback.
- A generic `OfferAdapter` contract defines pain detection, evidence, POC construction, and optional delivery without granting adapters authority over canonical state.
- `assertGroundedPoc` rejects POC claims without evidence and references to unknown evidence IDs.
- Suppression is a first-class concept with case-insensitive lookup support.
- Initial human gates protect new campaigns, unusual contracts, and destructive/security-sensitive customer operations.
- First offer hypothesis: **Accessibility Regression Watch** for agencies and other operators maintaining public website portfolios.
- `AccessibilityRegressionWatchAdapter` converts normalized automated accessibility findings into evidence, deterministic opportunity signals, and an evidence-grounded POC.
- `Pa11yAccessibilityScanner` is the canonical concrete scanner provider behind `AccessibilityScanProvider`, using pinned `pa11y` 10.0.0.
- `npm run a11y:manual-proof -- --name "Company" <url> [url ...]` runs the bounded manual-proof path for at most three explicit public HTTP(S) URLs.
- The offer POC explicitly states that automated findings are not a WCAG conformance determination, legal opinion, or substitute for knowledgeable human accessibility evaluation.
- The offer remains marked `manual-proof-required`; no prospect outreach, compliance claims, or autonomous sale path is enabled.

## Verified

At commit `f901a0df95c4b378f993d13ab5bcf278f7ed5b43`, GitHub Actions run `35284098870` passed the complete validation path:

- Node 24 dependency installation
- TypeScript compilation and full unit-test suite
- Accessibility Regression Watch adapter tests
- Pa11y normalization/configuration tests
- real browser-backed Pa11y execution against a controlled local fixture through the manual accessibility proof path
- PostgreSQL migrations `001_foundation.sql`, `002_workflow_results.sql`, and `003_workflow_delivery_receipts.sql`
- repeated migration with no reapplication
- live PostgreSQL smoke proof of state, score, event, outbox, result persistence, duplicate-delivery accounting, and conflicting-result rejection
- pinned n8n 2.39.7 disposable integration instance
- production webhook registration gate
- real signed DexFoundry dispatch to n8n
- signed n8n callback into DexFoundry
- deliberate duplicate redelivery proof preserving one durable result
- clean orchestration proof-process teardown

The concrete accessibility scanner runtime is therefore verified on the CI fixture while all previously proven orchestration and persistence invariants remain intact.

A stale-tree consolidation attempt briefly removed the wrong Pa11y implementation and correctly failed CI at TypeScript compilation. Repository authority was re-resolved from the actual commit chain: `main` had already selected the direct JS `Pa11yAccessibilityScanner` path and removed the earlier CLI-spawn provider. The direct provider, type boundary, tests, manual-proof CLI imports, and package export were restored/aligned before this revision was promoted.

Research-backed product boundary recorded in `docs/OFFER_ACCESSIBILITY_REGRESSION_WATCH.md`: the product is machine-detectable accessibility **regression monitoring**, not an automated claim of accessibility compliance.

GitHub repository existence and write access remain verified.

## Implemented but unverified

- Real scans against representative target-ICP websites.
- Stability/repeatability of findings across real public sites and repeated runs.
- Human usefulness of generated accessibility-regression POCs.
- Willingness to pay, pricing, close rate, or commercial demand for this offer.
- Long-running/production n8n deployment and process supervision outside disposable CI.
- Production secret rotation and deployment-specific secret storage.
- Apollo enrichment integration.
- Any real outbound email path.
- Customer delivery/reporting implementation for Accessibility Regression Watch.
- Local MacBook checkout parity with the GitHub repository; GitHub/CI remains the verified source baseline for this revision.

## Pending

1. Manually run the offer on at least five representative public sites from the target ICP and record false positives, instability, blocked scans, and human-judgment gaps.
2. Produce at least three real evidence-backed POCs manually.
3. Obtain at least one target buyer/operator reaction and attempt a manual sale before automating prospecting/outreach.
4. Only after manual proof: add Apollo enrichment and controlled discovery for this offer.
5. Add deliverability, suppression, rate, and campaign approval controls before any real outbound email is enabled.
6. Add customer reporting, health scoring, churn, and expansion loops after initial service delivery is manually proven.

## Protected invariants

- No direct `DISCOVERED -> WON` state jump.
- `DO_NOT_CONTACT` is terminal.
- Suppression must be checked before outbound sends.
- POC claims must be sourced or directly measured.
- Workflow/AI components and offer adapters may propose work but canonical state belongs in the control database.
- Durable business mutations and their dispatch intent must be committed atomically through Postgres plus the outbox.
- Downstream side effects must be idempotent because outbox delivery is at-least-once.
- A callback must be authenticated before its JSON is trusted or persisted.
- A duplicate workflow result may not create a second durable result or second business side effect.
- A conflicting duplicate result must be rejected and investigated rather than silently overwriting prior evidence.
- An offer POC may not contain an evidence-bearing claim whose evidence IDs are empty or unresolved.
- CI-only Docker use for disposable integration proof does not establish Docker as a local development or production requirement.
- Automated accessibility findings may not be represented as proof of WCAG conformance or legal compliance.
- A clean automated accessibility scan may not be represented as proof that a page is accessible.
- Accessibility Regression Watch may not begin automated prospect outreach while its commercial proof state is `manual-proof-required`.
- Runtime proof on a controlled fixture does not count as target-market or commercial proof.

## Revision history

### Revision 6 - 2026-09-17
Pinned Pa11y 10.0.0, wired the concrete `Pa11yAccessibilityScanner`, exposed the bounded manual-proof command, and added a real browser-backed local-fixture proof to CI. A stale-tree cleanup briefly removed the wrong provider path; CI caught the broken imports, repository authority was re-resolved from the current commit chain, and the canonical direct provider was restored. GitHub Actions run `35284098870` at commit `f901a0df95c4b378f993d13ab5bcf278f7ed5b43` passed build/tests, real Pa11y fixture execution, all Postgres proofs, and the full signed n8n duplicate-delivery loop. The scanner runtime is now proven; the offer remains commercially unproven and manually gated.

### Revision 5 - 2026-09-17
Selected Accessibility Regression Watch as the first bounded offer hypothesis after comparative research. Added a scanner-agnostic accessibility adapter, normalized evidence model, deterministic pain signals, evidence-grounded automated-only POC, tests, package export, and a manual-proof gate document. GitHub Actions run `35282883024` passed the complete existing orchestration/database proof after the adapter was added. This verifies the software contract, not commercial demand or real-world scan quality. The offer remains explicitly `manual-proof-required`.

### Revision 4 - 2026-09-17
Added migration 003 for duplicate-delivery receipts, the generic evidence-grounded `OfferAdapter` contract, and an importable signed n8n proof workflow. Reworked CI to Node 24 and a pinned official n8n 2.39.7 container after the earlier CLI path exposed runtime/bootstrap noise. GitHub Actions run `35277855045` then proved the real production-webhook path end to end: signed DexFoundry dispatch -> n8n verification -> signed callback -> durable result, followed by deliberate duplicate redelivery yielding one result with `delivery_count = 2`. Local development remains Docker-free.

### Revision 3 - 2026-09-17
Added and CI-verified the signed outbox dispatcher, stale-claim recovery, bounded retry, signed workflow-result ingestion, replay protection, canonical result hashing, durable workflow-result storage, duplicate no-op behavior, conflicting-duplicate rejection, and runnable dispatcher/result-server entry points. The first CI pass exposed a request-stream TypeScript typing defect; the repair commit then passed the full build, unit, migration, idempotency, and live PostgreSQL proof path. Live n8n execution remained intentionally unverified at this revision.

### Revision 2 - 2026-09-17
Added and verified the PostgreSQL repository, ordered/idempotent migration runner, event/outbox persistence, suppression lookup path, n8n contract, and CI database proof. Two CI-discovered defects were repaired before verification: multi-statement `pg` result handling and PostgreSQL UUID/text parameter inference in outbox inserts.

### Revision 1 - 2026-09-17
Initial repository foundation created.
