import type { LeadState } from "./state.js";

export interface FoundryEvent<T = Record<string, unknown>> {
  id: string;
  companyId: string;
  type: string;
  occurredAt: string;
  stateBefore?: LeadState;
  stateAfter?: LeadState;
  source: string;
  confidence?: number;
  payload: T;
}

export function makeEvent<T>(input: Omit<FoundryEvent<T>, "occurredAt">): FoundryEvent<T> {
  return { ...input, occurredAt: new Date().toISOString() };
}
