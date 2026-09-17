export interface OpportunitySignals {
  companyFit: boolean;
  industryFit: boolean;
  relevantHiring: boolean;
  visibleProblem: boolean;
  triggerEvent: boolean;
  highSeverity: boolean;
}

export interface OpportunityScore {
  score: number;
  action: "DISCARD" | "WATCH" | "QUALIFY" | "GENERATE_POC";
}

export function scoreOpportunity(s: OpportunitySignals): OpportunityScore {
  const score =
    (s.companyFit ? 15 : 0) +
    (s.industryFit ? 20 : 0) +
    (s.relevantHiring ? 15 : 0) +
    (s.visibleProblem ? 25 : 0) +
    (s.triggerEvent ? 10 : 0) +
    (s.highSeverity ? 15 : 0);

  if (score >= 85) return { score, action: "GENERATE_POC" };
  if (score >= 70) return { score, action: "QUALIFY" };
  if (score >= 50) return { score, action: "WATCH" };
  return { score, action: "DISCARD" };
}
