import { describe, expect, it } from "vitest";
import { Pa11yCliScanner, parsePa11yJson, type Pa11yExecutor } from "../src/offers/pa11yCliScanner.js";

describe("Pa11yCliScanner", () => {
  it("normalizes Pa11y JSON findings", () => {
    const findings = parsePa11yJson(JSON.stringify([
      {
        code: "image-alt",
        message: "Images must have alternate text",
        type: "error",
        selector: "#hero img",
        context: "<img src=\"hero.jpg\">",
        runnerExtras: { impact: "serious" }
      },
      {
        code: "color-contrast",
        message: "Element has insufficient color contrast",
        type: "warning"
      }
    ]));

    expect(findings).toEqual([
      {
        code: "image-alt",
        message: "Images must have alternate text",
        level: "error",
        selector: "#hero img",
        context: "<img src=\"hero.jpg\">",
        runner: "pa11y-axe",
        impact: "serious"
      },
      {
        code: "color-contrast",
        message: "Element has insufficient color contrast",
        level: "warning",
        selector: undefined,
        context: undefined,
        runner: "pa11y-axe",
        impact: "unknown"
      }
    ]);
  });

  it("accepts Pa11y exit code 2 as a completed scan with findings", async () => {
    const executor: Pa11yExecutor = async (command, args) => {
      expect(command).toBe("pa11y-test");
      expect(args).toContain("--runner");
      expect(args).toContain("axe");
      return {
        exitCode: 2,
        stdout: JSON.stringify([{ code: "button-name", message: "Buttons must have discernible text", type: "error" }]),
        stderr: ""
      };
    };

    const scanner = new Pa11yCliScanner("pa11y-test", executor);
    const result = await scanner.scan({ url: "https://example.com/" });
    expect(result.url).toBe("https://example.com/");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].code).toBe("button-name");
  });

  it("rejects execution failures and malformed output", async () => {
    const failed: Pa11yExecutor = async () => ({ exitCode: 1, stdout: "", stderr: "browser failed" });
    await expect(new Pa11yCliScanner("pa11y-test", failed).scan({ url: "https://example.com/" })).rejects.toThrow(/browser failed/);
    expect(() => parsePa11yJson("not-json")).toThrow(/invalid JSON/);
  });
});
