import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("accessibility service simulation CLI", () => {
  it("produces an internal-only mixed-change report from stored evidence", () => {
    const output = execFileSync(
      process.execPath,
      [
        resolve("dist/src/cli/accessibility-service-simulate.js"),
        "--baseline",
        resolve("tests/fixtures/service-baseline.json"),
        "--current",
        resolve("tests/fixtures/service-current.json"),
        "--review-minutes",
        "30",
        "--review-source",
        "fixture",
        "--labor-hourly",
        "80",
        "--tool-cost",
        "10",
        "--pilot-price",
        "750"
      ],
      { encoding: "utf8" }
    );

    const report = JSON.parse(output) as {
      externalDeliveryAllowed: boolean;
      conformanceDetermination: boolean;
      changeState: string;
      delta: {
        newCount: number;
        persistingCount: number;
        resolvedCount: number;
      };
      economics: {
        economicsState: string;
        modeledContributionCents: number;
      };
    };

    expect(report.externalDeliveryAllowed).toBe(false);
    expect(report.conformanceDetermination).toBe(false);
    expect(report.changeState).toBe("MIXED_CHANGE");
    expect(report.delta).toMatchObject({
      newCount: 1,
      persistingCount: 1,
      resolvedCount: 1
    });
    expect(report.economics.economicsState).toBe("SIMULATION_ONLY");
    expect(report.economics.modeledContributionCents).toBe(70000);
  });
});
