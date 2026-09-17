import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "../src/domain/scoring.js";

describe("opportunity scoring", () => {
  it("reserves POC generation for very strong leads", () => {
    const result = scoreOpportunity({
      companyFit: true,
      industryFit: true,
      relevantHiring: true,
      visibleProblem: true,
      triggerEvent: true,
      highSeverity: true
    });
    expect(result).toEqual({ score: 100, action: "GENERATE_POC" });
  });

  it("discards weak leads", () => {
    const result = scoreOpportunity({
      companyFit: true,
      industryFit: false,
      relevantHiring: false,
      visibleProblem: false,
      triggerEvent: false,
      highSeverity: false
    });
    expect(result.action).toBe("DISCARD");
  });
});
