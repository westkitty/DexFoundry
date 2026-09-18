import { describe, expect, it } from "vitest";
import {
  finishAccessibilityReviewSession,
  parseCompletedAccessibilityReviewSession,
  startAccessibilityReviewSession
} from "../src/offers/accessibilityReviewSession.js";

describe("accessibility review session", () => {
  it("derives active operator review time from timestamps and pauses", () => {
    const draft = startAccessibilityReviewSession({
      sessionId: "review-1",
      startedAt: "2026-09-17T12:00:00.000Z"
    });
    const session = finishAccessibilityReviewSession(
      draft,
      {
        pausedMinutes: 5,
        pagesReviewed: 3,
        noiseRemoved: 8,
        judgmentEscalations: 2,
        reportEditMinutes: 10,
        failedOrBlockedScans: 1,
        directToolCostCents: 250,
        notes: ["  one note  "]
      },
      "2026-09-17T12:45:00.000Z"
    );

    expect(session).toMatchObject({
      measurementState: "COMPLETE",
      elapsedMinutes: 45,
      pausedMinutes: 5,
      activeReviewMinutes: 40,
      pagesReviewed: 3,
      noiseRemoved: 8,
      judgmentEscalations: 2,
      reportEditMinutes: 10,
      failedOrBlockedScans: 1,
      directToolCostCents: 250,
      notes: ["one note"]
    });
    expect(parseCompletedAccessibilityReviewSession(session)).toEqual(session);
  });

  it("rejects impossible timing instead of manufacturing measured work", () => {
    const draft = startAccessibilityReviewSession({
      sessionId: "review-2",
      startedAt: "2026-09-17T12:00:00.000Z"
    });

    expect(() =>
      finishAccessibilityReviewSession(
        draft,
        {
          pausedMinutes: 30,
          pagesReviewed: 1,
          noiseRemoved: 0,
          judgmentEscalations: 0,
          reportEditMinutes: 0,
          failedOrBlockedScans: 0,
          directToolCostCents: 0
        },
        "2026-09-17T12:20:00.000Z"
      )
    ).toThrow(/pausedMinutes/);
  });

  it("rejects tampered derived minutes when loading a completed session", () => {
    const draft = startAccessibilityReviewSession({
      sessionId: "review-3",
      startedAt: "2026-09-17T12:00:00.000Z"
    });
    const session = finishAccessibilityReviewSession(
      draft,
      {
        pagesReviewed: 1,
        noiseRemoved: 0,
        judgmentEscalations: 0,
        reportEditMinutes: 1,
        failedOrBlockedScans: 0,
        directToolCostCents: 0
      },
      "2026-09-17T12:10:00.000Z"
    );

    expect(() =>
      parseCompletedAccessibilityReviewSession({
        ...session,
        activeReviewMinutes: 999
      })
    ).toThrow(/activeReviewMinutes/);
  });
});
