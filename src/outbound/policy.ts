export type OutboundMode = "DISABLED" | "MANUAL_ONLY" | "ENABLED";

export type OutboundBlocker =
  | "GLOBAL_DISABLED"
  | "SUPPRESSED"
  | "MANUAL_APPROVAL_REQUIRED";

export interface OutboundPolicyInput {
  mode: OutboundMode;
  suppressed: boolean;
  manualApproved?: boolean;
}

export interface OutboundDecision {
  allowed: boolean;
  mode: OutboundMode;
  blockers: OutboundBlocker[];
}

export function evaluateOutboundPolicy(input: OutboundPolicyInput): OutboundDecision {
  const blockers: OutboundBlocker[] = [];

  if (input.mode === "DISABLED") blockers.push("GLOBAL_DISABLED");
  if (input.suppressed) blockers.push("SUPPRESSED");
  if (input.mode === "MANUAL_ONLY" && input.manualApproved !== true) {
    blockers.push("MANUAL_APPROVAL_REQUIRED");
  }

  return {
    allowed: blockers.length === 0,
    mode: input.mode,
    blockers
  };
}
