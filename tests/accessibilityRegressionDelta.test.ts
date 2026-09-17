import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "../src/offers/contracts.js";
import { compareAccessibilityEvidence } from "../src/offers/accessibilityRegressionDelta.js";

function summary(source: string, fingerprints: string[]): EvidenceRecord {
  return {
    id: `summary-${source}-${fingerprints.length}`,
    fact: "Automated accessibility scan summary.",
    source,
    observedAt: "2026-09-17T23:00:00.000Z",
    metadata: {
      kind: "automated-accessibility-scan-summary",
      fingerprints
    }
  };
}

describe("compareAccessibilityEvidence", () => {
  it("classifies new, persisting, and resolved signatures on matching pages", () => {
    const previous = [
      summary("https://example.com/", [
        "error::color-contrast::.hero",
        "error::image-alt::img.logo"
      ])
    ];
    const current = [
      summary("https://example.com/", [
        "error::color-contrast::.hero",
        "error::button-name::button.menu"
      ])
    ];

    expect(compareAccessibilityEvidence(previous, current)).toEqual({
      pagesCompared: 1,
      newSignatures: ["https://example.com/::error::button-name::button.menu"],
      persistingSignatures: ["https://example.com/::error::color-contrast::.hero"],
      resolvedSignatures: ["https://example.com/::error::image-alt::img.logo"],
      previousUniqueSignatures: 2,
      currentUniqueSignatures: 2
    });
  });

  it("does not compare unrelated pages", () => {
    expect(() =>
      compareAccessibilityEvidence(
        [summary("https://example.com/a", ["error::a::#a"])],
        [summary("https://example.com/b", ["error::b::#b"])]
      )
    ).toThrow(/matching sampled page/i);
  });

  it("deduplicates repeated signatures before comparison", () => {
    const previous = [summary("https://example.com/", ["error::x::#x", "error::x::#x"])];
    const current = [summary("https://example.com/", ["error::x::#x", "warning::y::#y"])];
    const delta = compareAccessibilityEvidence(previous, current);

    expect(delta.previousUniqueSignatures).toBe(1);
    expect(delta.currentUniqueSignatures).toBe(2);
    expect(delta.persistingSignatures).toHaveLength(1);
    expect(delta.newSignatures).toHaveLength(1);
  });
});
