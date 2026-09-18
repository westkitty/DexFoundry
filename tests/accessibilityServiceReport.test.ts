import { describe, expect, it } from "vitest";
import {
  buildAccessibilityServiceReport,
  modelAccessibilityServiceEconomics
} from "../src/offers/accessibilityServiceReport.js";
import type { EvidenceRecord } from "../src/offers/contracts.js";

function summary(id: string, source: string, fingerprints: string[]): EvidenceRecord {
  return {
    id,
    fact: "Automated accessibility scan summary",
    source,
    observedAt: "2026-09-17T00:00:00.000Z",
    metadata: {
      kind: "automated-accessibility-scan-summary",
      fingerprints
    }
  };
}

describe("accessibility service report", () => {
  it("builds a bounded internal regression report with modeled economics", () => {
    const before = [
      summary("before", "https://example.com/", [
        "error::rule-a::#a",
        "warning::rule-w::.warning"
      ])
    ];
    const after = [
      summary("after", "https://example.com/", [
        "error::rule-a::#a",
        "error::rule-b::#b"
      ])
    ];

    const report = buildAccessibilityServiceReport(
      before,
      after,
      {
        reviewMinutes: 30,
        reviewMinutesSource: "fixture",
        laborCostPerHourCents: 8000,
        toolCostCents: 1000,
        pilotPriceCents: 75000
      },
      "2026-09-17T12:00:00.000Z"
    );

    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.conformanceDetermination).toBe(false);
    expect(report.requiresHumanReview).toBe(true);
    expect(report.changeState).toBe("MIXED_CHANGE");
    expect(report.delta).toMatchObject({
      pagesCompared: 1,
      newCount: 1,
      persistingCount: 1,
      resolvedCount: 1
    });
    expect(report.economics).toMatchObject({
      economicsState: "SIMULATION_ONLY",
      modeledLaborCostCents: 4000,
      toolCostCents: 1000,
      modeledTotalDirectCostCents: 5000,
      pilotPriceCents: 75000,
      modeledContributionCents: 70000,
      modeledContributionMarginBps: 9333
    });
  });

  it("distinguishes measured review time from fixture timing without claiming realized margin", () => {
    const economics = modelAccessibilityServiceEconomics({
      reviewMinutes: 45,
      reviewMinutesSource: "operator-measured",
      laborCostPerHourCents: 6000,
      toolCostCents: 0,
      pilotPriceCents: 75000
    });

    expect(economics.economicsState).toBe("MEASURED_REVIEW_TIME_MODELED_COSTS");
    expect(economics.modeledLaborCostCents).toBe(4500);
    expect(economics.modeledContributionCents).toBe(70500);
  });

  it("reports no signature change when the comparable fingerprints are identical", () => {
    const before = [summary("before", "https://example.com/", ["error::rule-a::#a"])];
    const after = [summary("after", "https://example.com/", ["error::rule-a::#a"])];

    const report = buildAccessibilityServiceReport(
      before,
      after,
      {
        reviewMinutes: 10,
        reviewMinutesSource: "fixture",
        laborCostPerHourCents: 6000,
        toolCostCents: 0,
        pilotPriceCents: 75000
      },
      "2026-09-17T12:00:00.000Z"
    );

    expect(report.changeState).toBe("NO_SIGNATURE_CHANGE");
    expect(report.delta.newCount).toBe(0);
    expect(report.delta.resolvedCount).toBe(0);
    expect(report.delta.persistingCount).toBe(1);
  });

  it("rejects invalid cost inputs instead of silently inventing economics", () => {
    expect(() =>
      modelAccessibilityServiceEconomics({
        reviewMinutes: -1,
        reviewMinutesSource: "fixture",
        laborCostPerHourCents: 6000,
        toolCostCents: 0,
        pilotPriceCents: 75000
      })
    ).toThrow(/reviewMinutes/);
  });
});
