import type { WorkflowResult } from "./contracts.js";
import { hashWorkflowResult, parseWorkflowResult } from "./workflowResult.js";
import { verifyWebhookSignature } from "./webhook.js";

export interface WorkflowResultRepository {
  recordWorkflowResult(result: WorkflowResult, resultHash: string): Promise<{ resultId: string; duplicate: boolean }>;
}

export interface WebhookHeaders {
  [name: string]: string | string[] | undefined;
}

export interface WorkflowResultIngestResponse {
  resultId: string;
  duplicate: boolean;
}

export class WorkflowResultIngestor {
  constructor(
    private readonly repository: WorkflowResultRepository,
    private readonly secret: string,
    private readonly now: () => number = () => Date.now()
  ) {}

  async ingest(rawBody: string, headers: WebhookHeaders): Promise<WorkflowResultIngestResponse> {
    const timestamp = headerValue(headers, "x-dexfoundry-timestamp");
    const signature = headerValue(headers, "x-dexfoundry-signature");
    verifyWebhookSignature({ secret: this.secret, timestamp, signature, rawBody, nowMs: this.now() });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new Error("Workflow result body must contain valid JSON");
    }

    const result = parseWorkflowResult(parsed);
    return this.repository.recordWorkflowResult(result, hashWorkflowResult(result));
  }
}

function headerValue(headers: WebhookHeaders, name: string): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(direct) ? direct[0] : direct;
}
