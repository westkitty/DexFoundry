import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("accessibility service simulation CLI", () => {
  it("produces an internal-only mixed-change report from fixture timing", () => {
    const output = execFileSync(process.execPath, [
      resolve("dist/src/cli/accessibility-service-simulate.js"),
      "--baseline", resolve("tests/fixtures/service-baseline.json"),
      "--current", resolve("tests/fixtures/service-current.json"),
      "--review-minutes", "30",
      "--review-source", "fixture",
      "--labor-hourly", "80",
      "--tool-cost", "10",
      "--pilot-price", "750"
    ], { encoding: "utf8" });
    const report = JSON.parse(output);
    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.changeState).toBe("MIXED_CHANGE");
    expect(report.economics.economicsState).toBe("SIMULATION_ONLY");
  });

  it("accepts a completed operator review session without manual minute overrides", () => {
    const output = execFileSync(process.execPath, [
      resolve("dist/src/cli/accessibility-service-simulate.js"),
      "--baseline", resolve("tests/fixtures/service-baseline.json"),
      "--current", resolve("tests/fixtures/service-current.json"),
      "--review-session", resolve("tests/fixtures/operator-review-session.json"),
      "--labor-hourly", "60",
      "--pilot-price", "750"
    ], { encoding: "utf8" });
    const report = JSON.parse(output);
    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.economics).toMatchObject({
      economicsState: "MEASURED_REVIEW_TIME_MODELED_COSTS",
      reviewMinutes: 40,
      toolCostCents: 250
    });
    expect(report.reviewSession).toMatchObject({
      sessionId: "fixture-operator-review",
      activeReviewMinutes: 40,
      pagesReviewed: 3
    });
  });

  it("rejects mixing a review session with hand-entered review minutes", () => {
    expect(() => execFileSync(process.execPath, [
      resolve("dist/src/cli/accessibility-service-simulate.js"),
      "--baseline", resolve("tests/fixtures/service-baseline.json"),
      "--current", resolve("tests/fixtures/service-current.json"),
      "--review-session", resolve("tests/fixtures/operator-review-session.json"),
      "--review-minutes", "999",
      "--labor-hourly", "60",
      "--pilot-price", "750"
    ], { encoding: "utf8", stdio: "pipe" })).toThrow();
  });
});
