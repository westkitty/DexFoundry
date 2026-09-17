import type {
  CompanySnapshot,
  EvidenceRecord,
  OfferAdapter,
  PainDetection,
  PocDraft
} from "./contracts.js";

export const ACCESSIBILITY_REGRESSION_WATCH_OFFER_ID = "accessibility-regression-watch";
export const ACCESSIBILITY_REGRESSION_WATCH_VERSION = "0.2.0-manual-proof";

export type AccessibilityFindingLevel = "error" | "warning" | "notice";
export type AccessibilityImpact = "critical" | "serious" | "moderate" | "minor" | "unknown";

export interface AccessibilityAuditTarget {
  url: string;
  label?: string;
}

export interface AccessibilityFinding {
  code: string;
  message: string;
  level: AccessibilityFindingLevel;
  selector?: string;
  context?: string;
  runner?: string;
  impact?: AccessibilityImpact;
}

export interface AccessibilityScanResult {
  url: string;
  observedAt: string;
  findings: AccessibilityFinding[];
}

export interface AccessibilityScanProvider {
  scan(target: AccessibilityAuditTarget): Promise<AccessibilityScanResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanAttribute(attributes: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => attributes[key] === true);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported audit URL protocol: ${parsed.protocol}`);
  }
  parsed.hash = "";
  return parsed.toString();
}

export function auditTargetsForCompany(company: CompanySnapshot): AccessibilityAuditTarget[] {
  const configured = company.attributes.auditUrls;
  const targets: AccessibilityAuditTarget[] = [];

  if (Array.isArray(configured)) {
    for (const entry of configured) {
      if (typeof entry === "string") {
        targets.push({ url: normalizeUrl(entry) });
      } else if (isRecord(entry) && typeof entry.url === "string") {
        targets.push({
          url: normalizeUrl(entry.url),
          label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : undefined
        });
      }
    }
  }

  if (targets.length === 0) targets.push({ url: normalizeUrl(company.domain), label: company.name });

  const deduped = new Map<string, AccessibilityAuditTarget>();
  for (const target of targets) {
    if (!deduped.has(target.url)) deduped.set(target.url, target);
  }

  return [...deduped.values()].slice(0, 3);
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function highSeverity(findings: readonly AccessibilityFinding[]): boolean {
  if (findings.some((finding) => finding.impact === "critical" || finding.impact === "serious")) return true;
  const errors = findings.filter((finding) => finding.level === "error");
  if (errors.length >= 5) return true;
  return [...countBy(errors, (finding) => finding.code).values()].some((count) => count >= 2);
}

export function representativeErrorFindings(
  findings: readonly AccessibilityFinding[],
  limit = 5
): AccessibilityFinding[] {
  const representatives: AccessibilityFinding[] = [];
  const seenCodes = new Set<string>();
  for (const finding of findings) {
    if (finding.level !== "error") continue;
    const code = finding.code.trim();
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    representatives.push(finding);
    if (representatives.length >= limit) break;
  }
  return representatives;
}

export function accessibilityFindingSignature(finding: AccessibilityFinding): string {
  return [
    finding.level,
    finding.code.trim(),
    finding.selector?.trim() ?? ""
  ].join("::");
}

function findingFingerprints(findings: readonly AccessibilityFinding[]): string[] {
  return [...new Set(findings.map(accessibilityFindingSignature))].sort();
}

function summaryEvidence(index: number, result: AccessibilityScanResult): EvidenceRecord {
  const errors = result.findings.filter((finding) => finding.level === "error").length;
  const warnings = result.findings.filter((finding) => finding.level === "warning").length;
  const fingerprints = findingFingerprints(result.findings);
  const errorFingerprints = findingFingerprints(result.findings.filter((finding) => finding.level === "error"));
  const warningFingerprints = findingFingerprints(result.findings.filter((finding) => finding.level === "warning"));
  return {
    id: `a11y-summary-${index + 1}`,
    fact: `Automated accessibility scan observed ${errors} error-level and ${warnings} warning-level findings on ${result.url}.`,
    source: result.url,
    observedAt: result.observedAt,
    confidence: 1,
    metadata: {
      kind: "automated-accessibility-scan-summary",
      errors,
      warnings,
      totalFindings: result.findings.length,
      fingerprints,
      errorFingerprints,
      warningFingerprints,
      uniqueFindingSignatures: fingerprints.length,
      uniqueErrorSignatures: errorFingerprints.length,
      uniqueWarningSignatures: warningFingerprints.length
    }
  };
}

function issueEvidence(pageIndex: number, issueIndex: number, result: AccessibilityScanResult, finding: AccessibilityFinding): EvidenceRecord {
  return {
    id: `a11y-issue-${pageIndex + 1}-${issueIndex + 1}`,
    fact: `${finding.level.toUpperCase()}: ${finding.message}`,
    source: result.url,
    observedAt: result.observedAt,
    confidence: 1,
    metadata: {
      kind: "automated-accessibility-finding",
      code: finding.code,
      level: finding.level,
      impact: finding.impact ?? "unknown",
      selector: finding.selector,
      context: finding.context,
      runner: finding.runner
    }
  };
}

export class AccessibilityRegressionWatchAdapter implements OfferAdapter {
  readonly offerId = ACCESSIBILITY_REGRESSION_WATCH_OFFER_ID;
  readonly version = ACCESSIBILITY_REGRESSION_WATCH_VERSION;

  constructor(private readonly scanner: AccessibilityScanProvider) {}

  async detectPain(company: CompanySnapshot): Promise<PainDetection> {
    const targets = auditTargetsForCompany(company);
    const results: AccessibilityScanResult[] = [];

    for (const target of targets) results.push(await this.scanner.scan(target));

    const findings = results.flatMap((result) => result.findings);
    const errors = findings.filter((finding) => finding.level === "error");
    const evidence: EvidenceRecord[] = [];

    for (const [pageIndex, result] of results.entries()) {
      evidence.push(summaryEvidence(pageIndex, result));
      const representatives = representativeErrorFindings(result.findings, 5);
      representatives.forEach((finding, issueIndex) => evidence.push(issueEvidence(pageIndex, issueIndex, result, finding)));
    }

    return {
      signals: {
        companyFit: booleanAttribute(company.attributes, "icpFit", "managesClientWebsites", "multiSitePortfolio"),
        industryFit: booleanAttribute(company.attributes, "digitalAgency", "webAgency", "publicSectorVendor", "ecommerceOperator"),
        relevantHiring: booleanAttribute(company.attributes, "accessibilityHiring", "qaHiring", "webMaintenanceHiring"),
        visibleProblem: errors.length > 0,
        triggerEvent: booleanAttribute(company.attributes, "titleIiRelevant", "eaaRelevant", "recentRedesign", "recentCmsMigration"),
        highSeverity: highSeverity(findings)
      },
      evidence
    };
  }

  async buildPoc(input: { company: CompanySnapshot; detection: PainDetection }): Promise<PocDraft> {
    const summaries = input.detection.evidence.filter((record) => record.metadata?.kind === "automated-accessibility-scan-summary");
    const issueEvidenceRecords = input.detection.evidence.filter((record) => record.metadata?.kind === "automated-accessibility-finding");
    const errorCount = summaries.reduce((sum, record) => sum + Number(record.metadata?.errors ?? 0), 0);
    const warningCount = summaries.reduce((sum, record) => sum + Number(record.metadata?.warnings ?? 0), 0);

    const claims = [
      {
        text: `Automated checks observed ${errorCount} error-level findings across ${summaries.length} sampled public page${summaries.length === 1 ? "" : "s"}.`,
        evidenceIds: summaries.map((record) => record.id)
      }
    ];

    if (issueEvidenceRecords.length > 0) {
      claims.push({
        text: "The sample includes machine-detectable findings with page-level selectors or rule identifiers that can be tracked for regression monitoring.",
        evidenceIds: issueEvidenceRecords.map((record) => record.id)
      });
    }

    return {
      title: `Accessibility regression snapshot for ${input.company.name}`,
      summary:
        "This is a bounded automated regression snapshot of sampled public pages. It is not a WCAG conformance determination, legal opinion, or substitute for knowledgeable human accessibility evaluation.",
      claims,
      metadata: {
        offerId: this.offerId,
        offerVersion: this.version,
        pagesSampled: summaries.length,
        errorCount,
        warningCount,
        automatedOnly: true,
        conformanceDetermination: false,
        commercialProofState: "manual-proof-required"
      }
    };
  }
}
