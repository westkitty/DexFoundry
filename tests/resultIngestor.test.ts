import { describe, expect, it } from "vitest";
import type { WorkflowResult } from "../src/orchestration/contracts.js";
import { WorkflowResultIngestor, type WorkflowResultRepository } from "../src/orchestration/resultIngestor.js";
import { signWebhookBody } from "../src/orchestration/webhook.js";

const secret = "0123456789abcdef0123456789abcdef";
const timestamp = "1789675200";
const now = () => Number(timestamp) * 1000;

class FakeRepository implements WorkflowResultRepository {
  calls: Array<{ result: WorkflowResult; hash: string }> = [];
  async recordWorkflowResult(result: WorkflowResult, hash: string) {
    this.calls.push({ result, hash });
    return { resultId: "result-1", duplicate: this.calls.length > 1 };
  }
}

function signedBody(result: WorkflowResult) {
  const rawBody = JSON.stringify(result);
  return {
    rawBody,
    headers: {
      "x-dexfoundry-timestamp": timestamp,
      "x-dexfoundry-signature": signWebhookBody(secret, timestamp, rawBody)
    }
  };
}

describe("workflow result ingestor", () => {
  it("verifies and persists a signed result", async () => {
    const repo = new FakeRepository();
    const ingestor = new WorkflowResultIngestor(repo, secret, now);
    const request = signedBody({
      schemaVersion: "1",
      idempotencyKey: "event:abc",
      workflow: "sample",
      status: "SUCCEEDED",
      completedAt: "2026-09-17T20:00:10.000Z",
      outputs: { ok: true }
    });
    expect(await ingestor.ingest(request.rawBody, request.headers)).toEqual({ resultId: "result-1", duplicate: false });
    expect(repo.calls).toHaveLength(1);
  });

  it("rejects an unsigned result before persistence", async () => {
    const repo = new FakeRepository();
    const ingestor = new WorkflowResultIngestor(repo, secret, now);
    await expect(ingestor.ingest("{}", {})).rejects.toThrow(/authentication headers/);
    expect(repo.calls).toHaveLength(0);
  });
});
