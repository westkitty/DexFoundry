import { describe, expect, it } from "vitest";
import { assertGroundedPoc, type EvidenceRecord, type PocDraft } from "../src/offers/contracts.js";

const evidence: EvidenceRecord[] = [
  {
    id: "e-1",
    fact: "The public pricing page changed.",
    source: "https://example.invalid/pricing",
    observedAt: "2026-09-17T20:00:00.000Z"
  }
];

const grounded: PocDraft = {
  title: "Proof",
  summary: "Observed evidence only.",
  claims: [{ text: "The pricing page changed.", evidenceIds: ["e-1"] }]
};

describe("offer adapter evidence contract", () => {
  it("accepts POC claims that reference known evidence", () => {
    expect(() => assertGroundedPoc(grounded, evidence)).not.toThrow();
  });

  it("rejects ungrounded and missing-evidence claims", () => {
    expect(() => assertGroundedPoc({ ...grounded, claims: [{ text: "Unsupported", evidenceIds: [] }] }, evidence)).toThrow(/Ungrounded/);
    expect(() => assertGroundedPoc({ ...grounded, claims: [{ text: "Missing", evidenceIds: ["e-404"] }] }, evidence)).toThrow(/missing evidence/);
  });

  it("rejects duplicate evidence ids", () => {
    expect(() => assertGroundedPoc(grounded, [evidence[0], evidence[0]])).toThrow(/Duplicate evidence id/);
  });
});
