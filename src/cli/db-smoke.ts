import { randomUUID } from "node:crypto";
import { FoundryRepository, WorkflowResultConflictError } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";
import { hashWorkflowResult } from "../orchestration/workflowResult.js";
import type { WorkflowResult } from "../orchestration/contracts.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = PostgresClient.fromConnectionString(connectionString);
const repository = new FoundryRepository(db);
const domain = `ci-${randomUUID()}.example.invalid`;

try {
  const inserted = await db.query<{ id: string }>(
    "INSERT INTO companies (name, domain) VALUES ($1, $2) RETURNING id",
    ["DexFoundry CI", domain]
  );
  const company = inserted.rows[0];
  if (!company) throw new Error("Failed to create CI company");

  const transition = await repository.transitionCompany({
    companyId: company.id,
    to: "SIGNAL_DETECTED",
    source: "ci-smoke",
    confidence: 1,
    payload: { proof: true }
  });
  if (transition.from !== "DISCOVERED" || transition.to !== "SIGNAL_DETECTED") {
    throw new Error("State transition did not persist expected states");
  }

  await repository.recordOpportunityScore(company.id, 85, "ci-smoke");

  const cleanOutbound = await repository.evaluateOutboundPermission({
    email: "nobody@example.invalid",
    domain: "example.invalid",
    manualApproved: true
  });
  if (cleanOutbound.allowed || !cleanOutbound.blockers.includes("GLOBAL_DISABLED")) {
    throw new Error(`Global outbound default-deny proof failed: ${JSON.stringify(cleanOutbound)}`);
  }

  await db.query(
    "INSERT INTO suppressions (email, reason, source) VALUES ($1, $2, $3)",
    ["blocked@example.invalid", "ci proof", "ci-smoke"]
  );
  const suppressedOutbound = await repository.evaluateOutboundPermission({
    email: "blocked@example.invalid",
    domain: "example.invalid",
    manualApproved: true
  });
  if (
    suppressedOutbound.allowed ||
    !suppressedOutbound.blockers.includes("GLOBAL_DISABLED") ||
    !suppressedOutbound.blockers.includes("SUPPRESSED")
  ) {
    throw new Error(`Suppression/outbound proof failed: ${JSON.stringify(suppressedOutbound)}`);
  }

  const outbox = await db.query<{ idempotency_key: string }>(
    "SELECT idempotency_key FROM foundry_outbox WHERE event_id = $1",
    [transition.eventId]
  );
  const idempotencyKey = outbox.rows[0]?.idempotency_key;
  if (!idempotencyKey) throw new Error("Missing state-transition outbox item");

  const workflowResult: WorkflowResult = {
    schemaVersion: "1",
    idempotencyKey,
    workflow: "ci-smoke-workflow",
    status: "SUCCEEDED",
    completedAt: new Date().toISOString(),
    outputs: { proof: true }
  };
  const resultHash = hashWorkflowResult(workflowResult);
  const firstResult = await repository.recordWorkflowResult(workflowResult, resultHash);
  const duplicateResult = await repository.recordWorkflowResult(workflowResult, resultHash);
  if (firstResult.duplicate || !duplicateResult.duplicate || firstResult.resultId !== duplicateResult.resultId) {
    throw new Error("Workflow result idempotency proof failed");
  }

  const conflicting: WorkflowResult = { ...workflowResult, outputs: { proof: false } };
  let conflictDetected = false;
  try {
    await repository.recordWorkflowResult(conflicting, hashWorkflowResult(conflicting));
  } catch (error) {
    if (error instanceof WorkflowResultConflictError) conflictDetected = true;
    else throw error;
  }
  if (!conflictDetected) throw new Error("Conflicting duplicate workflow result was not rejected");

  const proof = await db.query<{
    event_count: string;
    outbox_count: string;
    result_count: string;
    delivery_count: number;
    opportunity_score: number;
    state: string;
  }>(
    `SELECT c.state, c.opportunity_score,
       (SELECT count(*)::text FROM foundry_events e WHERE e.company_id = c.id) AS event_count,
       (SELECT count(*)::text FROM foundry_outbox o WHERE o.company_id = c.id) AS outbox_count,
       (SELECT count(*)::text FROM workflow_results r WHERE r.company_id = c.id) AS result_count,
       (SELECT delivery_count FROM workflow_results r WHERE r.company_id = c.id LIMIT 1) AS delivery_count
     FROM companies c WHERE c.id = $1`,
    [company.id]
  );
  const row = proof.rows[0];
  if (!row || row.state !== "SIGNAL_DETECTED" || row.opportunity_score !== 85 || row.event_count !== "2" || row.outbox_count !== "2" || row.result_count !== "1" || row.delivery_count !== 2) {
    throw new Error(`Persistence proof failed: ${JSON.stringify(row)}`);
  }

  await db.query("DELETE FROM companies WHERE id = $1", [company.id]);
  console.log("DexFoundry database smoke test passed, including outbound default-deny, suppression, duplicate-delivery accounting, and conflict rejection.");
} finally {
  await db.close();
}
