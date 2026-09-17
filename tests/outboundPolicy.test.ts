import { describe, expect, it } from "vitest";
import { evaluateOutboundPolicy } from "../src/outbound/policy.js";

describe("evaluateOutboundPolicy", () => {
  it("blocks all outbound work when the global mode is disabled", () => {
    expect(
      evaluateOutboundPolicy({
        mode: "DISABLED",
        suppressed: false,
        manualApproved: true
      })
    ).toEqual({
      allowed: false,
      mode: "DISABLED",
      blockers: ["GLOBAL_DISABLED"]
    });
  });

  it("preserves suppression as an independent blocker", () => {
    expect(
      evaluateOutboundPolicy({
        mode: "DISABLED",
        suppressed: true,
        manualApproved: true
      })
    ).toEqual({
      allowed: false,
      mode: "DISABLED",
      blockers: ["GLOBAL_DISABLED", "SUPPRESSED"]
    });
  });

  it("requires explicit manual approval in manual-only mode", () => {
    expect(
      evaluateOutboundPolicy({
        mode: "MANUAL_ONLY",
        suppressed: false
      })
    ).toEqual({
      allowed: false,
      mode: "MANUAL_ONLY",
      blockers: ["MANUAL_APPROVAL_REQUIRED"]
    });

    expect(
      evaluateOutboundPolicy({
        mode: "MANUAL_ONLY",
        suppressed: false,
        manualApproved: true
      })
    ).toEqual({
      allowed: true,
      mode: "MANUAL_ONLY",
      blockers: []
    });
  });

  it("never permits a suppressed recipient even when enabled", () => {
    expect(
      evaluateOutboundPolicy({
        mode: "ENABLED",
        suppressed: true,
        manualApproved: true
      }).allowed
    ).toBe(false);
  });

  it("allows only an unsuppressed recipient in enabled mode", () => {
    expect(
      evaluateOutboundPolicy({
        mode: "ENABLED",
        suppressed: false
      })
    ).toEqual({
      allowed: true,
      mode: "ENABLED",
      blockers: []
    });
  });
});
