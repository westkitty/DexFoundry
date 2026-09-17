import { randomUUID } from "node:crypto";
import { FoundryRepository } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = PostgresClient.fromConnectionString(connectionString);
const repository = new FoundryRepository(db);
const domain = `n8n-proof-${randomUUID()}.example.invalid`;

try {
  const inserted = await db.query<{ id: string }>(
    "INSERT INTO companies (name, domain) VALUES ($1, $2) RETURNING id",
    ["DexFoundry n8n Proof", domain]
  );
  const company = inserted.rows[0];
  if (!company) throw new Error("Failed to create n8n proof company");

  const transition = await repository.transitionCompany({
    companyId: company.id,
    to: "SIGNAL_DETECTED",
    source: "n8n-proof",
    confidence: 1,
    payload: { proof: "n8n-e2e" }
  });

  const outbox = await db.query<{ id: string; idempotency_key: string }>(
    "SELECT id, idempotency_key FROM foundry_outbox WHERE event_id = $1",
    [transition.eventId]
  );
  const row = outbox.rows[0];
  if (!row) throw new Error("Missing n8n proof outbox item");

  console.log(JSON.stringify({ companyId: company.id, outboxId: row.id, idempotencyKey: row.idempotency_key }));
} finally {
  await db.close();
}
