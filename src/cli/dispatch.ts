import { FoundryRepository } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";
import { OutboxDispatcher } from "../orchestration/dispatcher.js";

const connectionString = process.env.DATABASE_URL;
const endpoint = process.env.N8N_WEBHOOK_URL;
const secret = process.env.DEXFOUNDRY_WEBHOOK_SECRET;
const limit = Number(process.env.DEXFOUNDRY_DISPATCH_LIMIT ?? "50");

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!endpoint) throw new Error("N8N_WEBHOOK_URL is required");
if (!secret) throw new Error("DEXFOUNDRY_WEBHOOK_SECRET is required");
if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("DEXFOUNDRY_DISPATCH_LIMIT must be 1..500");

const db = PostgresClient.fromConnectionString(connectionString);
try {
  const repository = new FoundryRepository(db);
  const dispatcher = new OutboxDispatcher(repository, endpoint, secret);
  const summary = await dispatcher.dispatchBatch(limit);
  console.log(JSON.stringify(summary));
} finally {
  await db.close();
}
