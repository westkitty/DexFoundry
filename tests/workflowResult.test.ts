import { describe, expect, it } from "vitest";
import { canonicalJson, hashWorkflowResult, parseWorkflowResult, WorkflowResultValidationError } from "../src/orchestration/workflowResult.js";

describe("workflow result validation", () => {
  it("accepts and hashes a valid result deterministically", () => {
    const result = parseWorkflowResult({
      schemaVersion: "1",
      idempotencyKey: "event:123",
      workflow: "sample",
      status: "SUCCEEDED",
      completedAt: "2026-09-17T20:00:10.000Z",
      outputs: { b: 2, a: 1 }
    });
    const reordered = { ...result, outputs: { a: 1, b: 2 } };
    expect(hashWorkflowResult(result)).toBe(hashWorkflowResult(reordered));
    expect(canonicalJson({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
  });

  it("rejects invalid status and timestamp", () => {
    expect(() => parseWorkflowResult({
      schemaVersion: "1",
      idempotencyKey: "event:123",
      workflow: "sample",
      status: "NOPE",
      completedAt: "not-a-date"
    })).toThrow(WorkflowResultValidationError);
  });
});
