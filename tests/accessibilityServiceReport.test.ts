import { describe, expect, it } from "vitest";
import {
  finishAccessibilityReviewSession,
  startAccessibilityReviewSession
} from "../src/offers/accessibilityReviewSession.js";
import {
  buildAccessibilityServiceReport,
  buildAccessibilityServiceReportFromReviewSession,
  modelAccessibilityServiceEconomics
} from "../src/offers/accessibilityServiceReport.js";
import type { EvidenceRecord } from "../src/offers/contracts.js";

function summary(id: string, source: string, fingerprints: string[]): EvidenceRecord {
  return {
    id,
    fact: "Automated accessibility scan summary",
    source,
    observedAt: "2026-09-17T00:00:00.000Z",
    metadata: { kind: "automated-accessibility-scan-summary", fingerprints }
  };
}

describe("accessibility service report", () => {
  it("builds a bounded internal regression report with modeled fixture economics", () => {
    const before = [summary("before", "https://example.com/", ["error::rule-a::#a", "warning::rule-w::.warning"])];
    const after = [summary("after", "https://example.com/", ["error::rule-a::#a", "error::rule-b::#b"])];
    const report = buildAccessibilityServiceReport(before, after, {
      reviewMinutes: 30,
      reviewMinutesSource: "fixture",
      laborCostPerHourCents: 8000,
      toolCostCents: 1000,
      pilotPriceCents: 75000
    }, "2026-09-17T12:00:00.000Z");

    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.conformanceDetermination).toBe(false);
    expect(report.changeState).toBe("MIXED_CHANGE");
    expect(report.delta).toMatchObject({ pagesCompared: 1, newCount: 1, persistingCount: 1, resolvedCount: 1 });
    expect(report.economics).toMatchObject({
      economicsState: "SIMULATION_ONLY",
      modeledLaborCostCents: 4000,
      toolCostCents: 1000,
      modeledTotalDirectCostCents: 5000,
      modeledContributionCents: 70000,
      modeledContributionMarginBps: 9333
    });
  });

  it("uses a completed review session as measured-time authority", () => {
    const before = [summary("before", "https://example.com/", ["error::rule-a::#a"])];
    const after = [summary("after", "https://example.com/", ["error::rule-a::#a"])];
    const session = finishAccessibilityReviewSession(
      startAccessibilityReviewSession({ sessionId: "measured-1", startedAt: "2026-09-17T12:00:00.000Z" }),
      {
        pausedMinutes: 5,
        pagesReviewed: 3,
        noiseRemoved: 4,
        judgmentEscalations: 2,
        reportEditMinutes: 10,
        failedOrBlockedScans: 1,
        directToolCostCents: 250
      },
      "2026-09-17T12:45:00.000Z"
    );
    const report = buildAccessibilityServiceReportFromReviewSession(before, after, session, {
      laborCostPerHourCents: 6000,
      pilotPriceCents: 75000
    }, "2026-09-17T13:00:00.000Z");

    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.economics).toMatchObject({
      economicsState: "MEASURED_REVIEW_TIME_MODELED_COSTS",
      reviewMinutes: 40,
      toolCostCents: 250,
      modeledLaborCostCents: 4000,
      modeledTotalDirectCostCents: 4250,
      modeledContributionCents: 70750
    });
    expect(report.reviewSession).toMatchObject({
      sessionId: "measured-1",
      activeReviewMinutes: 40,
      pagesReviewed: 3,
      noiseRemoved: 4,
      judgmentEscalations: 2,
      failedOrBlockedScans: 1
    });
  });

  it("reports no signature change when fingerprints are identical", () => {
    const before = [summary("before", "https://example.com/", ["error::rule-a::#a"])];
    const after = [summary("after", "https://example.com/", ["error::rule-a::#a"])];
    const report = buildAccessibilityServiceReport(before, after, {
      reviewMinutes: 10,
      reviewMinutesSource: "fixture",
      laborCostPerHourCents: 6000,
      toolCostCents: 0,
      pilotPriceCents: 75000
    }, "2026-09-17T12:00:00.000Z");
    expect(report.changeState).toBe("NO_SIGNATURE_CHANGE");
  });

  it("rejects invalid cost inputs", () => {
    expect(() => modelAccessibilityServiceEconomics({
      reviewMinutes: -1,
      reviewMinutesSource: "fixture",
      laborCostPerHourCents: 6000,
      toolCostCents: 0,
      pilotPriceCents: 75000
    })).toThrow(/reviewMinutes/);
  });
});
