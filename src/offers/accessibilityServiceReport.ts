import { compareAccessibilityEvidence, type AccessibilityRegressionDelta } from "./accessibilityRegressionDelta.js";
import {
  parseCompletedAccessibilityReviewSession,
  type AccessibilityReviewSession
} from "./accessibilityReviewSession.js";
import type { EvidenceRecord } from "./contracts.js";

export type ReviewMinutesSource = "operator-measured" | "fixture";
export type AccessibilityServiceChangeState =
  | "NO_SIGNATURE_CHANGE"
  | "REGRESSION_DETECTED"
  | "IMPROVEMENT_DETECTED"
  | "MIXED_CHANGE";

export interface AccessibilityServiceCostInput {
  reviewMinutes: number;
  reviewMinutesSource: ReviewMinutesSource;
  laborCostPerHourCents: number;
  toolCostCents: number;
  pilotPriceCents: number;
}

export interface AccessibilityServiceEconomics {
  economicsState: "SIMULATION_ONLY" | "MEASURED_REVIEW_TIME_MODELED_COSTS";
  reviewMinutes: number;
  reviewMinutesSource: ReviewMinutesSource;
  laborCostPerHourCents: number;
  modeledLaborCostCents: number;
  toolCostCents: number;
  modeledTotalDirectCostCents: number;
  pilotPriceCents: number;
  modeledContributionCents: number;
  modeledContributionMarginBps: number;
}

export interface AccessibilityServiceReviewEvidence {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  elapsedMinutes: number;
  pausedMinutes: number;
  activeReviewMinutes: number;
  pagesReviewed: number;
  noiseRemoved: number;
  judgmentEscalations: number;
  reportEditMinutes: number;
  failedOrBlockedScans: number;
  directToolCostCents: number;
}

export interface AccessibilityServiceReport {
  reportVersion: "1";
  simulation: true;
  generatedAt: string;
  externalDeliveryAllowed: false;
  requiresHumanReview: true;
  conformanceDetermination: false;
  changeState: AccessibilityServiceChangeState;
  delta: AccessibilityRegressionDelta & {
    newCount: number;
    persistingCount: number;
    resolvedCount: number;
    representativeNew: string[];
    representativeResolved: string[];
  };
  economics: AccessibilityServiceEconomics;
  reviewSession?: AccessibilityServiceReviewEvidence;
  caveats: string[];
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function assertCostInput(input: AccessibilityServiceCostInput): void {
  assertFiniteNonNegative(input.reviewMinutes, "reviewMinutes");
  assertFiniteNonNegative(input.laborCostPerHourCents, "laborCostPerHourCents");
  assertFiniteNonNegative(input.toolCostCents, "toolCostCents");
  if (!Number.isFinite(input.pilotPriceCents) || input.pilotPriceCents <= 0) {
    throw new Error("pilotPriceCents must be a finite positive number");
  }
}

function classifyChange(delta: AccessibilityRegressionDelta): AccessibilityServiceChangeState {
  const hasNew = delta.newSignatures.length > 0;
  const hasResolved = delta.resolvedSignatures.length > 0;
  if (hasNew && hasResolved) return "MIXED_CHANGE";
  if (hasNew) return "REGRESSION_DETECTED";
  if (hasResolved) return "IMPROVEMENT_DETECTED";
  return "NO_SIGNATURE_CHANGE";
}

export function modelAccessibilityServiceEconomics(
  input: AccessibilityServiceCostInput
): AccessibilityServiceEconomics {
  assertCostInput(input);
  const modeledLaborCostCents = Math.ceil((input.reviewMinutes / 60) * input.laborCostPerHourCents);
  const modeledTotalDirectCostCents = modeledLaborCostCents + input.toolCostCents;
  const modeledContributionCents = input.pilotPriceCents - modeledTotalDirectCostCents;
  const modeledContributionMarginBps = Math.round(
    (modeledContributionCents / input.pilotPriceCents) * 10_000
  );

  return {
    economicsState:
      input.reviewMinutesSource === "operator-measured"
        ? "MEASURED_REVIEW_TIME_MODELED_COSTS"
        : "SIMULATION_ONLY",
    reviewMinutes: input.reviewMinutes,
    reviewMinutesSource: input.reviewMinutesSource,
    laborCostPerHourCents: input.laborCostPerHourCents,
    modeledLaborCostCents,
    toolCostCents: input.toolCostCents,
    modeledTotalDirectCostCents,
    pilotPriceCents: input.pilotPriceCents,
    modeledContributionCents,
    modeledContributionMarginBps
  };
}

export function buildAccessibilityServiceReport(
  previous: readonly EvidenceRecord[],
  current: readonly EvidenceRecord[],
  costs: AccessibilityServiceCostInput,
  generatedAt = new Date().toISOString()
): AccessibilityServiceReport {
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new Error("generatedAt must be a valid date/time");
  }

  const delta = compareAccessibilityEvidence(previous, current);

  return {
    reportVersion: "1",
    simulation: true,
    generatedAt,
    externalDeliveryAllowed: false,
    requiresHumanReview: true,
    conformanceDetermination: false,
    changeState: classifyChange(delta),
    delta: {
      ...delta,
      newCount: delta.newSignatures.length,
      persistingCount: delta.persistingSignatures.length,
      resolvedCount: delta.resolvedSignatures.length,
      representativeNew: delta.newSignatures.slice(0, 5),
      representativeResolved: delta.resolvedSignatures.slice(0, 5)
    },
    economics: modelAccessibilityServiceEconomics(costs),
    caveats: [
      "This report is an internal service simulation and is not authorized for external delivery.",
      "Automated accessibility findings do not establish WCAG conformance or legal compliance.",
      "Modeled contribution is not realized profit, gross margin, buyer demand, or commercial proof.",
      "Review time is only treated as measured when it comes from a completed operator review session."
    ]
  };
}

export function buildAccessibilityServiceReportFromReviewSession(
  previous: readonly EvidenceRecord[],
  current: readonly EvidenceRecord[],
  reviewSession: AccessibilityReviewSession,
  input: {
    laborCostPerHourCents: number;
    pilotPriceCents: number;
  },
  generatedAt = new Date().toISOString()
): AccessibilityServiceReport {
  const verifiedSession = parseCompletedAccessibilityReviewSession(reviewSession);
  const report = buildAccessibilityServiceReport(
    previous,
    current,
    {
      reviewMinutes: verifiedSession.activeReviewMinutes,
      reviewMinutesSource: "operator-measured",
      laborCostPerHourCents: input.laborCostPerHourCents,
      toolCostCents: verifiedSession.directToolCostCents,
      pilotPriceCents: input.pilotPriceCents
    },
    generatedAt
  );

  return {
    ...report,
    reviewSession: {
      sessionId: verifiedSession.sessionId,
      startedAt: verifiedSession.startedAt,
      endedAt: verifiedSession.endedAt,
      elapsedMinutes: verifiedSession.elapsedMinutes,
      pausedMinutes: verifiedSession.pausedMinutes,
      activeReviewMinutes: verifiedSession.activeReviewMinutes,
      pagesReviewed: verifiedSession.pagesReviewed,
      noiseRemoved: verifiedSession.noiseRemoved,
      judgmentEscalations: verifiedSession.judgmentEscalations,
      reportEditMinutes: verifiedSession.reportEditMinutes,
      failedOrBlockedScans: verifiedSession.failedOrBlockedScans,
      directToolCostCents: verifiedSession.directToolCostCents
    }
  };
}
