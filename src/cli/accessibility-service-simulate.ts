import { readFile } from "node:fs/promises";
import { parseCompletedAccessibilityReviewSession } from "../offers/accessibilityReviewSession.js";
import {
  buildAccessibilityServiceReport,
  buildAccessibilityServiceReportFromReviewSession,
  type ReviewMinutesSource
} from "../offers/accessibilityServiceReport.js";
import type { EvidenceRecord } from "../offers/contracts.js";

interface ParsedArgs {
  baseline: string;
  current: string;
  reviewSession?: string;
  reviewMinutes?: number;
  reviewMinutesSource?: ReviewMinutesSource;
  laborCostPerHourCents: number;
  toolCostCents?: number;
  pilotPriceCents: number;
}

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  npm run a11y:simulate-service -- --baseline baseline.json --current current.json --review-session review-session.json --labor-hourly 80 --pilot-price 750",
      "  npm run a11y:simulate-service -- --baseline baseline.json --current current.json --review-minutes 30 --review-source fixture --labor-hourly 80 --tool-cost 10 --pilot-price 750"
    ].join("\n")
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
    if (values.has(key)) throw new Error(`${key} may be provided only once`);
    values.set(key, value);
  }

  const baseline = values.get("--baseline");
  const current = values.get("--current");
  if (!baseline || !current) usage();

  const reviewSession = values.get("--review-session");
  const hasManualReviewInput =
    values.has("--review-minutes") || values.has("--review-source") || values.has("--tool-cost");

  if (reviewSession && hasManualReviewInput) {
    throw new Error("--review-session cannot be combined with --review-minutes, --review-source, or --tool-cost");
  }

  if (reviewSession) {
    return {
      baseline,
      current,
      reviewSession,
      laborCostPerHourCents: dollarsToCents(values.get("--labor-hourly"), "labor-hourly"),
      pilotPriceCents: dollarsToCents(values.get("--pilot-price"), "pilot-price", false)
    };
  }

  const source = values.get("--review-source");
  if (source !== "fixture") {
    throw new Error("Manual review-minute input is fixture-only; use --review-session for operator-measured time");
  }

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

  const report = args.reviewSession
    ? buildAccessibilityServiceReportFromReviewSession(
        baseline,
        current,
        parseCompletedAccessibilityReviewSession(JSON.parse(await readFile(args.reviewSession, "utf8"))),
        {
          laborCostPerHourCents: args.laborCostPerHourCents,
          pilotPriceCents: args.pilotPriceCents
        }
      )
    : buildAccessibilityServiceReport(
        baseline,
        current,
        {
          reviewMinutes: args.reviewMinutes!,
          reviewMinutesSource: args.reviewMinutesSource!,
          laborCostPerHourCents: args.laborCostPerHourCents,
          toolCostCents: args.toolCostCents!,
          pilotPriceCents: args.pilotPriceCents
        }
      );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
