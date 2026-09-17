import { spawn } from "node:child_process";
import type {
  AccessibilityAuditTarget,
  AccessibilityFinding,
  AccessibilityFindingLevel,
  AccessibilityImpact,
  AccessibilityScanProvider,
  AccessibilityScanResult
} from "./accessibilityRegressionWatch.js";

interface Pa11yIssue {
  code?: unknown;
  message?: unknown;
  type?: unknown;
  selector?: unknown;
  context?: unknown;
  runnerExtras?: unknown;
}

export interface Pa11yProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type Pa11yExecutor = (command: string, args: string[]) => Promise<Pa11yProcessResult>;

function defaultExecutor(command: string, args: string[]): Promise<Pa11yProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ exitCode: code ?? -1, stdout, stderr }));
  });
}

function findingLevel(value: unknown): AccessibilityFindingLevel {
  return value === "warning" || value === "notice" ? value : "error";
}

function impactFromExtras(value: unknown): AccessibilityImpact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "unknown";
  const impact = (value as Record<string, unknown>).impact;
  return impact === "critical" || impact === "serious" || impact === "moderate" || impact === "minor"
    ? impact
    : "unknown";
}

export function parsePa11yJson(raw: string): AccessibilityFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Pa11y returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsed)) throw new Error("Pa11y JSON output must be an array");

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Pa11y issue ${index + 1} must be an object`);
    }
    const issue = entry as Pa11yIssue;
    if (typeof issue.message !== "string" || !issue.message.trim()) {
      throw new Error(`Pa11y issue ${index + 1} is missing a message`);
    }

    return {
      code: typeof issue.code === "string" && issue.code.trim() ? issue.code : `pa11y-issue-${index + 1}`,
      message: issue.message.trim(),
      level: findingLevel(issue.type),
      selector: typeof issue.selector === "string" && issue.selector.trim() ? issue.selector : undefined,
      context: typeof issue.context === "string" && issue.context.trim() ? issue.context : undefined,
      runner: "pa11y-axe",
      impact: impactFromExtras(issue.runnerExtras)
    };
  });
}

export class Pa11yCliScanner implements AccessibilityScanProvider {
  constructor(
    private readonly command = process.env.DEXFOUNDRY_PA11Y_COMMAND ?? "pa11y",
    private readonly execute: Pa11yExecutor = defaultExecutor
  ) {}

  async scan(target: AccessibilityAuditTarget): Promise<AccessibilityScanResult> {
    const args = [
      target.url,
      "--runner",
      "axe",
      "--reporter",
      "json",
      "--include-warnings",
      "--include-notices"
    ];
    const result = await this.execute(this.command, args);

    // Pa11y uses exit code 2 when the configured issue threshold is exceeded.
    // That still represents a successful scan with findings, not an execution failure.
    if (result.exitCode !== 0 && result.exitCode !== 2) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.exitCode}`;
      throw new Error(`Pa11y scan failed for ${target.url}: ${detail}`);
    }

    return {
      url: target.url,
      observedAt: new Date().toISOString(),
      findings: parsePa11yJson(result.stdout)
    };
  }
}
