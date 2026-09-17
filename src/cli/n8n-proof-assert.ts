import { PostgresClient } from "../db/postgres.js";

const connectionString = process.env.DATABASE_URL;
const idempotencyKey = process.argv[2];
if (!connectionString) throw new Error("DATABASE_URL is required");
if (!idempotencyKey) throw new Error("Usage: n8n-proof-assert <idempotency-key>");

const db = PostgresClient.fromConnectionString(connectionString);
try {
  const proof = await db.query<{
    status: string;
    attempts: number;
    result_count: string;
    delivery_count: number;
    workflow: string;
  }>(
    `SELECT o.status, o.attempts,
       (SELECT count(*)::text FROM workflow_results r WHERE r.idempotency_key = o.idempotency_key) AS result_count,
       (SELECT delivery_count FROM workflow_results r WHERE r.idempotency_key = o.idempotency_key AND r.workflow = 'dexfoundry-n8n-proof') AS delivery_count,
       (SELECT workflow FROM workflow_results r WHERE r.idempotency_key = o.idempotency_key LIMIT 1) AS workflow
     FROM foundry_outbox o
     WHERE o.idempotency_key = $1`,
    [idempotencyKey]
  );
  const row = proof.rows[0];
  if (!row) throw new Error("Missing n8n proof outbox row");
  if (row.status !== "PUBLISHED" || row.attempts !== 2 || row.result_count !== "1" || row.delivery_count !== 2 || row.workflow !== "dexfoundry-n8n-proof") {
    throw new Error(`n8n proof failed: ${JSON.stringify(row)}`);
  }
  console.log("DexFoundry n8n end-to-end duplicate-delivery proof passed.");
} finally {
  await db.close();
}
