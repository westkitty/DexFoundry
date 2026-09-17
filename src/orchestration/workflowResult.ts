import { createHash } from "node:crypto";
import type { WorkflowResult } from "./contracts.js";

export class WorkflowResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowResultValidationError";
  }
}

export function parseWorkflowResult(value: unknown): WorkflowResult {
  const object = requireObject(value, "workflow result");
  const schemaVersion = requireString(object.schemaVersion, "schemaVersion");
  if (schemaVersion !== "1") throw new WorkflowResultValidationError(`Unsupported schemaVersion: ${schemaVersion}`);

  const idempotencyKey = requireBoundedString(object.idempotencyKey, "idempotencyKey", 512);
  const workflow = requireBoundedString(object.workflow, "workflow", 256);
  const status = requireString(object.status, "status");
  if (status !== "SUCCEEDED" && status !== "FAILED" && status !== "SKIPPED") {
    throw new WorkflowResultValidationError(`Invalid workflow status: ${status}`);
  }

  const completedAt = requireString(object.completedAt, "completedAt");
  if (Number.isNaN(Date.parse(completedAt))) {
    throw new WorkflowResultValidationError("completedAt must be a valid timestamp");
  }

  const result: WorkflowResult = {
    schemaVersion: "1",
    idempotencyKey,
    workflow,
    status,
    completedAt
  };

  if (object.outputs !== undefined) {
    result.outputs = requireObject(object.outputs, "outputs");
  }

  if (object.error !== undefined) {
    const error = requireObject(object.error, "error");
    result.error = {
      code: requireBoundedString(error.code, "error.code", 128),
      message: requireBoundedString(error.message, "error.message", 2000),
      retryable: requireBoolean(error.retryable, "error.retryable")
    };
  }

  return result;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new WorkflowResultValidationError("Non-finite numbers cannot be canonicalized");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
  }
  throw new WorkflowResultValidationError(`Unsupported JSON value type: ${typeof value}`);
}

export function hashWorkflowResult(result: WorkflowResult): string {
  return createHash("sha256").update(canonicalJson(result), "utf8").digest("hex");
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowResultValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new WorkflowResultValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

function requireBoundedString(value: unknown, label: string, maxLength: number): string {
  const text = requireString(value, label);
  if (text.length > maxLength) throw new WorkflowResultValidationError(`${label} exceeds ${maxLength} characters`);
  return text;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new WorkflowResultValidationError(`${label} must be a boolean`);
  return value;
}
