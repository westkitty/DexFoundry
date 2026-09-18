import { readFile } from "node:fs/promises";
import {
  buildAccessibilityServiceReport,
  type ReviewMinutesSource
} from "../offers/accessibilityServiceReport.js";
import type { EvidenceRecord } from "../offers/contracts.js";

interface ParsedArgs {
  baseline: string;
  current: string;
  reviewMinutes: number;
  reviewMinutesSource: ReviewMinutesSource;
  laborCostPerHourCents: number;
  toolCostCents: number;
  pilotPriceCents: number;
}

function usage(): never {
  throw new Error(
    "Usage: npm run a11y:simulate-service -- --baseline baseline.json --current current.json --review-minutes 30 --review-source fixture|operator-measured --labor-hourly 80 --tool-cost 10 --pilot-price 750"
  );
}

function parseNumber(value: string | undefined, label: string, allowZero = true): number {
  if (value === undefined || value.trim() === "") usage();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
    throw new Error(`${label} must be a ${allowZero ? "non-negative" : "positive"} number`);
  }
  return parsed;
}

function dollarsToCents(value: string | undefined, label: string, allowZero = true): number {
  const dollars = parseNumber(value, label, allowZero);
  return Math.round(dollars * 100);
}

function parseArgs(args: string[]): ParsedArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) usage();
    values.set(key, value);
  }

  const baseline = values.get("--baseline");
  const current = values.get("--current");
  const source = values.get("--review-source");
  if (!baseline || !current || (source !== "fixture" && source !== "operator-measured")) usage();

  return {
    baseline,
    current,
    reviewMinutes: parseNumber(values.get("--review-minutes"), "review-minutes"),
    reviewMinutesSource: source,
    laborCostPerHourCents: dollarsToCents(values.get("--labor-hourly"), "labor-hourly"),
    toolCostCents: dollarsToCents(values.get("--tool-cost"), "tool-cost"),
    pilotPriceCents: dollarsToCents(values.get("--pilot-price"), "pilot-price", false)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function evidenceFromJson(value: unknown, label: string): EvidenceRecord[] {
  const candidate = Array.isArray(value) ? value : isRecord(value) ? value.evidence : undefined;
  if (!Array.isArray(candidate)) {
    throw new Error(`${label} must be an evidence array or a manual-proof JSON object containing evidence`);
  }

  return candidate.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.fact !== "string" ||
      typeof entry.source !== "string" ||
      typeof entry.observedAt !== "string"
    ) {
      throw new Error(`${label} evidence entry ${index + 1} is malformed`);
    }
    if (entry.metadata !== undefined && !isRecord(entry.metadata)) {
      throw new Error(`${label} evidence entry ${index + 1} has invalid metadata`);
    }
    return entry as unknown as EvidenceRecord;
  });
}

async function loadEvidence(path: string, label: string): Promise<EvidenceRecord[]> {
  const raw = await readFile(path, "utf8");
  return evidenceFromJson(JSON.parse(raw), label);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const [baseline, current] = await Promise.all([
    loadEvidence(args.baseline, "baseline"),
    loadEvidence(args.current, "current")
  ]);

  const report = buildAccessibilityServiceReport(
    baseline,
    current,
    {
      reviewMinutes: args.reviewMinutes,
      reviewMinutesSource: args.reviewMinutesSource,
      laborCostPerHourCents: args.laborCostPerHourCents,
      toolCostCents: args.toolCostCents,
      pilotPriceCents: args.pilotPriceCents
    }
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
