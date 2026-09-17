import { PostgresClient } from "../db/postgres.js";

const connectionString = process.env.DATABASE_URL;
const idempotencyKey = process.argv[2];
if (!connectionString) throw new Error("DATABASE_URL is required");
if (!idempotencyKey) throw new Error("Usage: n8n-proof-replay <idempotency-key>");

const db = PostgresClient.fromConnectionString(connectionString);
try {
  const result = await db.query(
    `UPDATE foundry_outbox
     SET status = 'PENDING', available_at = now(), locked_at = NULL, published_at = NULL
     WHERE idempotency_key = $1 AND status = 'PUBLISHED'`,
    [idempotencyKey]
  );
  if (result.rowCount !== 1) throw new Error(`Expected one published outbox row to replay; got ${result.rowCount}`);
  console.log(`Requeued ${idempotencyKey} for duplicate-delivery proof.`);
} finally {
  await db.close();
}
