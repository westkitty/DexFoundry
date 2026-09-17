import { AccessibilityRegressionWatchAdapter } from "../offers/accessibilityRegressionWatch.js";
import { assertGroundedPoc, type CompanySnapshot } from "../offers/contracts.js";
import { Pa11yCliScanner } from "../offers/pa11yCliScanner.js";

function usage(): never {
  throw new Error(
    "Usage: npm run a11y:manual-proof -- --name \"Company\" https://example.com/ [https://example.com/page ...] (maximum 3 public URLs)"
  );
}

function parseArgs(args: string[]): { name: string; urls: string[] } {
  let name = "Manual proof target";
  const urls: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--name") {
      const value = args[index + 1];
      if (!value?.trim()) usage();
      name = value.trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) usage();
    urls.push(arg);
  }

  if (urls.length === 0 || urls.length > 3) usage();
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Only public HTTP(S) URLs are accepted: ${url}`);
    }
  }

  return { name, urls };
}

async function main(): Promise<void> {
  const { name, urls } = parseArgs(process.argv.slice(2));
  const first = new URL(urls[0]);
  const company: CompanySnapshot = {
    companyId: `manual-proof:${first.hostname}`,
    name,
    domain: first.origin,
    attributes: {
      auditUrls: urls,
      manualProof: true
    }
  };

  const adapter = new AccessibilityRegressionWatchAdapter(new Pa11yCliScanner());
  const detection = await adapter.detectPain(company);
  const poc = await adapter.buildPoc({ company, detection });
  assertGroundedPoc(poc, detection.evidence);

  process.stdout.write(
    `${JSON.stringify(
      {
        proofState: "MANUAL_REVIEW_REQUIRED",
        offerId: adapter.offerId,
        company,
        signals: detection.signals,
        evidence: detection.evidence,
        poc
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
