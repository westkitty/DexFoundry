import pa11y, { type Pa11yIssue } from "pa11y";
import type {
  AccessibilityAuditTarget,
  AccessibilityFinding,
  AccessibilityFindingLevel,
  AccessibilityImpact,
  AccessibilityScanProvider,
  AccessibilityScanResult
} from "./accessibilityRegressionWatch.js";

export interface Pa11yScannerOptions {
  timeoutMs?: number;
  runners?: string[];
  standard?: "WCAG2A" | "WCAG2AA" | "WCAG2AAA";
  includeWarnings?: boolean;
  includeNotices?: boolean;
  now?: () => Date;
}

function normalizeLevel(issue: Pa11yIssue): AccessibilityFindingLevel {
  const type = issue.type?.toLowerCase();
  if (type === "warning") return "warning";
  if (type === "notice") return "notice";
  return "error";
}

function normalizeImpact(value: string | null | undefined): AccessibilityImpact {
  if (value === "critical" || value === "serious" || value === "moderate" || value === "minor") return value;
  return "unknown";
}

export function normalizePa11yIssue(issue: Pa11yIssue): AccessibilityFinding {
  return {
    code: issue.code,
    message: issue.message,
    level: normalizeLevel(issue),
    selector: issue.selector,
    context: issue.context,
    runner: issue.runner ?? "pa11y",
    impact: normalizeImpact(issue.impact)
  };
}

export class Pa11yAccessibilityScanner implements AccessibilityScanProvider {
  private readonly timeoutMs: number;
  private readonly runners: string[];
  private readonly standard: "WCAG2A" | "WCAG2AA" | "WCAG2AAA";
  private readonly includeWarnings: boolean;
  private readonly includeNotices: boolean;
  private readonly now: () => Date;

  constructor(options: Pa11yScannerOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.runners = options.runners ?? ["axe", "htmlcs"];
    this.standard = options.standard ?? "WCAG2AA";
    this.includeWarnings = options.includeWarnings ?? true;
    this.includeNotices = options.includeNotices ?? false;
    this.now = options.now ?? (() => new Date());

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 120_000) {
      throw new Error("Pa11y scanner timeout must be between 1 and 120000 milliseconds");
    }
    if (this.runners.length === 0) throw new Error("Pa11y scanner requires at least one runner");
  }

  async scan(target: AccessibilityAuditTarget): Promise<AccessibilityScanResult> {
    const parsed = new URL(target.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported Pa11y target protocol: ${parsed.protocol}`);
    }

    const result = await pa11y(parsed.toString(), {
      runners: this.runners,
      standard: this.standard,
      includeWarnings: this.includeWarnings,
      includeNotices: this.includeNotices,
      timeout: this.timeoutMs
    });

    return {
      url: result.pageUrl || parsed.toString(),
      observedAt: this.now().toISOString(),
      findings: result.issues.map(normalizePa11yIssue)
    };
  }
}
