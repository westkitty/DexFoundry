import type { EvidenceRecord } from "./contracts.js";

export interface AccessibilityRegressionDelta {
  pagesCompared: number;
  newSignatures: string[];
  persistingSignatures: string[];
  resolvedSignatures: string[];
  previousUniqueSignatures: number;
  currentUniqueSignatures: number;
}

function summaries(evidence: readonly EvidenceRecord[]): EvidenceRecord[] {
  return evidence.filter((record) => record.metadata?.kind === "automated-accessibility-scan-summary");
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function qualifiedSignatures(evidence: readonly EvidenceRecord[]): Set<string> {
  const signatures = new Set<string>();
  for (const record of summaries(evidence)) {
    for (const signature of strings(record.metadata?.fingerprints)) {
      signatures.add(`${record.source}::${signature}`);
    }
  }
  return signatures;
}

export function compareAccessibilityEvidence(
  previous: readonly EvidenceRecord[],
  current: readonly EvidenceRecord[]
): AccessibilityRegressionDelta {
  const previousPages = new Set(summaries(previous).map((record) => record.source));
  const currentPages = new Set(summaries(current).map((record) => record.source));
  const comparablePages = [...previousPages].filter((source) => currentPages.has(source));

  if (comparablePages.length === 0) {
    throw new Error("Accessibility regression comparison requires at least one matching sampled page");
  }

  const allowed = new Set(comparablePages);
  const filterToComparablePages = (records: readonly EvidenceRecord[]) =>
    records.filter(
      (record) =>
        record.metadata?.kind !== "automated-accessibility-scan-summary" || allowed.has(record.source)
    );

  const before = qualifiedSignatures(filterToComparablePages(previous));
  const after = qualifiedSignatures(filterToComparablePages(current));

  const newSignatures = [...after].filter((signature) => !before.has(signature)).sort();
  const persistingSignatures = [...after].filter((signature) => before.has(signature)).sort();
  const resolvedSignatures = [...before].filter((signature) => !after.has(signature)).sort();

  return {
    pagesCompared: comparablePages.length,
    newSignatures,
    persistingSignatures,
    resolvedSignatures,
    previousUniqueSignatures: before.size,
    currentUniqueSignatures: after.size
  };
}
