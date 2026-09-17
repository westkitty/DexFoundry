import type { OpportunitySignals } from "../domain/scoring.js";

export interface CompanySnapshot {
  companyId: string;
  name: string;
  domain: string;
  attributes: Record<string, unknown>;
}

export interface EvidenceRecord {
  id: string;
  fact: string;
  source: string;
  observedAt: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface PainDetection {
  signals: OpportunitySignals;
  evidence: EvidenceRecord[];
}

export interface PocClaim {
  text: string;
  evidenceIds: string[];
}

export interface PocDraft {
  title: string;
  summary: string;
  claims: PocClaim[];
  metadata?: Record<string, unknown>;
}

export interface DeliveryRequest {
  company: CompanySnapshot;
  configuration: Record<string, unknown>;
}

export interface DeliveryResult {
  externalId?: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  evidence: EvidenceRecord[];
  outputs?: Record<string, unknown>;
}

export interface OfferAdapter {
  readonly offerId: string;
  readonly version: string;
  detectPain(company: CompanySnapshot): Promise<PainDetection>;
  buildPoc(input: { company: CompanySnapshot; detection: PainDetection }): Promise<PocDraft>;
  deliver?(request: DeliveryRequest): Promise<DeliveryResult>;
}

export function assertGroundedPoc(poc: PocDraft, evidence: readonly EvidenceRecord[]): void {
  const available = new Set(evidence.map((record) => record.id));
  const seen = new Set<string>();

  for (const record of evidence) {
    if (!record.id.trim()) throw new Error("Evidence records require non-empty ids");
    if (seen.has(record.id)) throw new Error(`Duplicate evidence id: ${record.id}`);
    seen.add(record.id);
  }

  for (const claim of poc.claims) {
    if (!claim.text.trim()) throw new Error("POC claims require non-empty text");
    if (claim.evidenceIds.length === 0) throw new Error(`Ungrounded POC claim: ${claim.text}`);
    for (const id of claim.evidenceIds) {
      if (!available.has(id)) throw new Error(`POC claim references missing evidence: ${id}`);
    }
  }
}
