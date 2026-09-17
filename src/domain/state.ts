export const leadStates = [
  "DISCOVERED",
  "SIGNAL_DETECTED",
  "QUALIFIED",
  "CONTACT_FOUND",
  "POC_ELIGIBLE",
  "POC_CREATED",
  "POC_APPROVED",
  "OUTREACH_READY",
  "CONTACTED",
  "ENGAGED",
  "MEETING_BOOKED",
  "PROPOSAL_SENT",
  "WON",
  "ONBOARDING",
  "ACTIVE",
  "RENEWAL",
  "DISQUALIFIED",
  "DO_NOT_CONTACT",
  "BOUNCED",
  "LOST",
  "CHURNED"
] as const;

export type LeadState = (typeof leadStates)[number];

const allowed: Record<LeadState, readonly LeadState[]> = {
  DISCOVERED: ["SIGNAL_DETECTED", "DISQUALIFIED", "DO_NOT_CONTACT"],
  SIGNAL_DETECTED: ["QUALIFIED", "DISQUALIFIED", "DO_NOT_CONTACT"],
  QUALIFIED: ["CONTACT_FOUND", "DISQUALIFIED", "DO_NOT_CONTACT"],
  CONTACT_FOUND: ["POC_ELIGIBLE", "DISQUALIFIED", "DO_NOT_CONTACT", "BOUNCED"],
  POC_ELIGIBLE: ["POC_CREATED", "DISQUALIFIED", "DO_NOT_CONTACT"],
  POC_CREATED: ["POC_APPROVED", "DISQUALIFIED", "DO_NOT_CONTACT"],
  POC_APPROVED: ["OUTREACH_READY", "DISQUALIFIED", "DO_NOT_CONTACT"],
  OUTREACH_READY: ["CONTACTED", "DO_NOT_CONTACT"],
  CONTACTED: ["ENGAGED", "BOUNCED", "DO_NOT_CONTACT", "LOST"],
  ENGAGED: ["MEETING_BOOKED", "PROPOSAL_SENT", "DO_NOT_CONTACT", "LOST"],
  MEETING_BOOKED: ["PROPOSAL_SENT", "LOST", "DO_NOT_CONTACT"],
  PROPOSAL_SENT: ["WON", "LOST", "DO_NOT_CONTACT"],
  WON: ["ONBOARDING", "LOST"],
  ONBOARDING: ["ACTIVE", "LOST"],
  ACTIVE: ["RENEWAL", "CHURNED"],
  RENEWAL: ["ACTIVE", "CHURNED"],
  DISQUALIFIED: [],
  DO_NOT_CONTACT: [],
  BOUNCED: [],
  LOST: [],
  CHURNED: []
};

export function canTransition(from: LeadState, to: LeadState): boolean {
  return allowed[from].includes(to);
}

export function assertTransition(from: LeadState, to: LeadState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal DexFoundry transition: ${from} -> ${to}`);
  }
}
