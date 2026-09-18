export const ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION = "1" as const;
export const ACCESSIBILITY_REVIEW_SESSION_TYPE = "accessibility-regression-review" as const;

export interface AccessibilityReviewSessionDraft {
  schemaVersion: typeof ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION;
  sessionType: typeof ACCESSIBILITY_REVIEW_SESSION_TYPE;
  sessionId: string;
  measurementState: "IN_PROGRESS";
  startedAt: string;
}

export interface AccessibilityReviewSession {
  schemaVersion: typeof ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION;
  sessionType: typeof ACCESSIBILITY_REVIEW_SESSION_TYPE;
  sessionId: string;
  measurementState: "COMPLETE";
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
  notes: string[];
}

export interface AccessibilityReviewSessionMetrics {
  pausedMinutes?: number;
  pagesReviewed: number;
  noiseRemoved: number;
  judgmentEscalations: number;
  reportEditMinutes: number;
  failedOrBlockedScans: number;
  directToolCostCents: number;
  notes?: string[];
}

function assertDate(value: string, label: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date/time`);
  return timestamp;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function roundMinutes(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function cleanNotes(notes: readonly string[] | undefined): string[] {
  if (!notes) return [];
  return notes.map((note) => note.trim()).filter(Boolean);
}

export function startAccessibilityReviewSession(input: {
  sessionId: string;
  startedAt?: string;
}): AccessibilityReviewSessionDraft {
  const sessionId = input.sessionId.trim();
  if (!sessionId) throw new Error("sessionId is required");
  const startedAt = input.startedAt ?? new Date().toISOString();
  assertDate(startedAt, "startedAt");
  return {
    schemaVersion: ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION,
    sessionType: ACCESSIBILITY_REVIEW_SESSION_TYPE,
    sessionId,
    measurementState: "IN_PROGRESS",
    startedAt
  };
}

export function finishAccessibilityReviewSession(
  draft: AccessibilityReviewSessionDraft,
  metrics: AccessibilityReviewSessionMetrics,
  endedAt = new Date().toISOString()
): AccessibilityReviewSession {
  assertReviewSessionDraft(draft);
  const start = assertDate(draft.startedAt, "startedAt");
  const end = assertDate(endedAt, "endedAt");
  if (end <= start) throw new Error("endedAt must be after startedAt");

  const elapsedMinutes = roundMinutes((end - start) / 60_000);
  const pausedMinutes = metrics.pausedMinutes ?? 0;
  assertNonNegative(pausedMinutes, "pausedMinutes");
  if (pausedMinutes >= elapsedMinutes) {
    throw new Error("pausedMinutes must be less than elapsedMinutes");
  }

  assertPositiveInteger(metrics.pagesReviewed, "pagesReviewed");
  assertNonNegativeInteger(metrics.noiseRemoved, "noiseRemoved");
  assertNonNegativeInteger(metrics.judgmentEscalations, "judgmentEscalations");
  assertNonNegative(metrics.reportEditMinutes, "reportEditMinutes");
  assertNonNegativeInteger(metrics.failedOrBlockedScans, "failedOrBlockedScans");
  assertNonNegativeInteger(metrics.directToolCostCents, "directToolCostCents");

  const activeReviewMinutes = roundMinutes(elapsedMinutes - pausedMinutes);
  if (metrics.reportEditMinutes > activeReviewMinutes) {
    throw new Error("reportEditMinutes cannot exceed activeReviewMinutes");
  }

  return {
    schemaVersion: ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION,
    sessionType: ACCESSIBILITY_REVIEW_SESSION_TYPE,
    sessionId: draft.sessionId,
    measurementState: "COMPLETE",
    startedAt: draft.startedAt,
    endedAt,
    elapsedMinutes,
    pausedMinutes: roundMinutes(pausedMinutes),
    activeReviewMinutes,
    pagesReviewed: metrics.pagesReviewed,
    noiseRemoved: metrics.noiseRemoved,
    judgmentEscalations: metrics.judgmentEscalations,
    reportEditMinutes: roundMinutes(metrics.reportEditMinutes),
    failedOrBlockedScans: metrics.failedOrBlockedScans,
    directToolCostCents: metrics.directToolCostCents,
    notes: cleanNotes(metrics.notes)
  };
}

export function assertReviewSessionDraft(value: unknown): asserts value is AccessibilityReviewSessionDraft {
  if (!isRecord(value)) throw new Error("review session draft must be an object");
  if (value.schemaVersion !== ACCESSIBILITY_REVIEW_SESSION_SCHEMA_VERSION) {
    throw new Error("unsupported review session schemaVersion");
  }
  if (value.sessionType !== ACCESSIBILITY_REVIEW_SESSION_TYPE) {
    throw new Error("unsupported review session type");
  }
  if (value.measurementState !== "IN_PROGRESS") {
    throw new Error("review session is not IN_PROGRESS");
  }
  if (typeof value.sessionId !== "string" || !value.sessionId.trim()) {
    throw new Error("review session sessionId is required");
  }
  if (typeof value.startedAt !== "string") throw new Error("review session startedAt is required");
  assertDate(value.startedAt, "startedAt");
}

export function parseCompletedAccessibilityReviewSession(value: unknown): AccessibilityReviewSession {
  if (!isRecord(value)) throw new Error("review session must be an object");
  if (value.measurementState !== "COMPLETE") throw new Error("review session must be COMPLETE");

  const requiredStrings = ["sessionId", "startedAt", "endedAt"] as const;
  for (const key of requiredStrings) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      throw new Error(`review session ${key} is required`);
    }
  }

  const draft: AccessibilityReviewSessionDraft = {
    schemaVersion: value.schemaVersion as "1",
    sessionType: value.sessionType as "accessibility-regression-review",
    sessionId: value.sessionId as string,
    measurementState: "IN_PROGRESS",
    startedAt: value.startedAt as string
  };

  const notes = Array.isArray(value.notes)
    ? value.notes.filter((item): item is string => typeof item === "string")
    : [];

  const rebuilt = finishAccessibilityReviewSession(
    draft,
    {
      pausedMinutes: asNumber(value.pausedMinutes, "pausedMinutes"),
      pagesReviewed: asNumber(value.pagesReviewed, "pagesReviewed"),
      noiseRemoved: asNumber(value.noiseRemoved, "noiseRemoved"),
      judgmentEscalations: asNumber(value.judgmentEscalations, "judgmentEscalations"),
      reportEditMinutes: asNumber(value.reportEditMinutes, "reportEditMinutes"),
      failedOrBlockedScans: asNumber(value.failedOrBlockedScans, "failedOrBlockedScans"),
      directToolCostCents: asNumber(value.directToolCostCents, "directToolCostCents"),
      notes
    },
    value.endedAt as string
  );

  const claimedElapsed = asNumber(value.elapsedMinutes, "elapsedMinutes");
  const claimedActive = asNumber(value.activeReviewMinutes, "activeReviewMinutes");
  if (Math.abs(claimedElapsed - rebuilt.elapsedMinutes) > 0.001) {
    throw new Error("review session elapsedMinutes does not match timestamps");
  }
  if (Math.abs(claimedActive - rebuilt.activeReviewMinutes) > 0.001) {
    throw new Error("review session activeReviewMinutes does not match timestamps and pauses");
  }

  return rebuilt;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number") throw new Error(`review session ${label} must be a number`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
