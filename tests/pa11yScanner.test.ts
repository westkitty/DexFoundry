import { describe, expect, it } from "vitest";
import { Pa11yAccessibilityScanner, normalizePa11yIssue } from "../src/offers/pa11yScanner.js";

describe("Pa11y scanner boundary", () => {
  it("normalizes Pa11y issues into the offer finding contract", () => {
    expect(
      normalizePa11yIssue({
        code: "color-contrast",
        message: "Elements must meet minimum color contrast ratio thresholds.",
        selector: ".cta",
        context: "<a class=\"cta\">Continue</a>",
        type: "error",
        runner: "axe",
        impact: "serious"
      })
    ).toEqual({
      code: "color-contrast",
      message: "Elements must meet minimum color contrast ratio thresholds.",
      level: "error",
      selector: ".cta",
      context: "<a class=\"cta\">Continue</a>",
      runner: "axe",
      impact: "serious"
    });
  });

  it("maps unknown issue types and impacts conservatively", () => {
    expect(
      normalizePa11yIssue({
        code: "custom-rule",
        message: "Custom result",
        type: "mystery",
        impact: "catastrophic"
      })
    ).toMatchObject({ level: "error", impact: "unknown", runner: "pa11y" });
  });

  it("rejects invalid timeout and empty runner configuration", () => {
    expect(() => new Pa11yAccessibilityScanner({ timeoutMs: 0 })).toThrow(/timeout/i);
    expect(() => new Pa11yAccessibilityScanner({ timeoutMs: 120_001 })).toThrow(/timeout/i);
    expect(() => new Pa11yAccessibilityScanner({ runners: [] })).toThrow(/runner/i);
  });
});
