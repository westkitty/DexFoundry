import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  assertReviewSessionDraft,
  finishAccessibilityReviewSession,
  startAccessibilityReviewSession
} from "../offers/accessibilityReviewSession.js";

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  npm run a11y:review-session -- start --output review-session.json [--session-id id] [--started-at ISO]",
      "  npm run a11y:review-session -- finish --session review-session.json --pages-reviewed N --noise-removed N --judgment-escalations N --report-edit-minutes N --failed-or-blocked-scans N --direct-tool-cost DOLLARS [--paused-minutes N] [--ended-at ISO] [--note text]"
    ].join("\n")
  );
}

function parseFlags(args: string[]): Map<string, string[]> {
  const flags = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) usage();
    const existing = flags.get(key) ?? [];
    existing.push(value);
    flags.set(key, existing);
  }
  return flags;
}

function one(flags: Map<string, string[]>, key: string, required = false): string | undefined {
  const values = flags.get(key);
  if (!values || values.length === 0) {
    if (required) usage();
    return undefined;
  }
  if (values.length !== 1) throw new Error(`${key} may be provided only once`);
  return values[0];
}

function nonNegativeNumber(value: string | undefined, label: string, required = true): number {
  if (value === undefined) {
    if (required) usage();
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be non-negative`);
  return parsed;
}

function nonNegativeInteger(value: string | undefined, label: string): number {
  const parsed = nonNegativeNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer`);
  return parsed;
}

function positiveInteger(value: string | undefined, label: string): number {
  const parsed = nonNegativeInteger(value, label);
  if (parsed < 1) throw new Error(`${label} must be at least 1`);
  return parsed;
}

function dollarsToCents(value: string | undefined): number {
  return Math.round(nonNegativeNumber(value, "direct-tool-cost") * 100);
}

async function start(flags: Map<string, string[]>): Promise<void> {
  const output = one(flags, "--output", true)!;
  const session = startAccessibilityReviewSession({
    sessionId: one(flags, "--session-id") ?? `review-${randomUUID()}`,
    startedAt: one(flags, "--started-at")
  });
  await writeFile(output, `${JSON.stringify(session, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ path: output, session }, null, 2)}\n`);
}

async function finish(flags: Map<string, string[]>): Promise<void> {
  const path = one(flags, "--session", true)!;
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  assertReviewSessionDraft(raw);

  const session = finishAccessibilityReviewSession(
    raw,
    {
      pausedMinutes: nonNegativeNumber(one(flags, "--paused-minutes"), "paused-minutes", false),
      pagesReviewed: positiveInteger(one(flags, "--pages-reviewed", true), "pages-reviewed"),
      noiseRemoved: nonNegativeInteger(one(flags, "--noise-removed", true), "noise-removed"),
      judgmentEscalations: nonNegativeInteger(one(flags, "--judgment-escalations", true), "judgment-escalations"),
      reportEditMinutes: nonNegativeNumber(one(flags, "--report-edit-minutes", true), "report-edit-minutes"),
      failedOrBlockedScans: nonNegativeInteger(one(flags, "--failed-or-blocked-scans", true), "failed-or-blocked-scans"),
      directToolCostCents: dollarsToCents(one(flags, "--direct-tool-cost", true)),
      notes: flags.get("--note") ?? []
    },
    one(flags, "--ended-at") ?? new Date().toISOString()
  );

  await writeFile(path, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ path, session }, null, 2)}\n`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command !== "start" && command !== "finish") usage();
  const flags = parseFlags(args);
  if (command === "start") await start(flags);
  else await finish(flags);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
