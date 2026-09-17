import { describe, expect, it } from "vitest";
import { assertGroundedPoc, type CompanySnapshot } from "../src/offers/contracts.js";
import {
  AccessibilityRegressionWatchAdapter,
  auditTargetsForCompany,
  type AccessibilityScanProvider
} from "../src/offers/accessibilityRegressionWatch.js";

const company: CompanySnapshot = {
  companyId: "company-1",
  name: "Example Agency",
  domain: "example.com",
  attributes: {
    digitalAgency: true,
    managesClientWebsites: true,
    titleIiRelevant: true,
    auditUrls: ["https://example.com/", "https://example.com/contact#top"]
  }
};

const scanner: AccessibilityScanProvider = {
  async scan(target) {
    return {
      url: target.url,
      observedAt: "2026-09-17T22:00:00.000Z",
      findings: [
        {
          code: "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37",
          message: "Img element missing an alt attribute.",
          level: "error",
          selector: "#hero img",
          runner: "pa11y-htmlcs",
          impact: "serious"
        }
      ]
    };
  }
};

describe("AccessibilityRegressionWatchAdapter", () => {
  it("normalizes and deduplicates audit targets", () => {
    expect(auditTargetsForCompany(company)).toEqual([
      { url: "https://example.com/" },
      { url: "https://example.com/contact", label: undefined }
    ]);
  });

  it("produces visible-problem signals and grounded evidence", async () => {
    const adapter = new AccessibilityRegressionWatchAdapter(scanner);
    const detection = await adapter.detectPain(company);

    expect(detection.signals).toMatchObject({
      companyFit: true,
      industryFit: true,
      visibleProblem: true,
      triggerEvent: true,
      highSeverity: true
    });
    expect(detection.evidence).toHaveLength(4);

    const poc = await adapter.buildPoc({ company, detection });
    expect(poc.metadata).toMatchObject({ automatedOnly: true, conformanceDetermination: false });
    expect(poc.summary).toMatch(/not a WCAG conformance determination/i);
    expect(() => assertGroundedPoc(poc, detection.evidence)).not.toThrow();
  });

  it("does not invent a visible problem when an automated scan returns no errors", async () => {
    const cleanScanner: AccessibilityScanProvider = {
      async scan(target) {
        return { url: target.url, observedAt: "2026-09-17T22:00:00.000Z", findings: [] };
      }
    };
    const adapter = new AccessibilityRegressionWatchAdapter(cleanScanner);
    const detection = await adapter.detectPain({ ...company, attributes: { digitalAgency: true } });
    expect(detection.signals.visibleProblem).toBe(false);
    expect(detection.signals.highSeverity).toBe(false);
  });
});
