import { randomUUID } from "node:crypto";
import { FoundryRepository } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";

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

  const proof = await db.query<{ event_count: string; outbox_count: string; opportunity_score: number; state: string }>(
    `SELECT c.state, c.opportunity_score,
       (SELECT count(*)::text FROM foundry_events e WHERE e.company_id = c.id) AS event_count,
       (SELECT count(*)::text FROM foundry_outbox o WHERE o.company_id = c.id) AS outbox_count
     FROM companies c WHERE c.id = $1`,
    [company.id]
  );
  const row = proof.rows[0];
  if (!row || row.state !== "SIGNAL_DETECTED" || row.opportunity_score !== 85 || row.event_count !== "2" || row.outbox_count !== "2") {
    throw new Error(`Persistence proof failed: ${JSON.stringify(row)}`);
  }

  await db.query("DELETE FROM companies WHERE id = $1", [company.id]);
  console.log("DexFoundry database smoke test passed.");
} finally {
  await db.close();
}
