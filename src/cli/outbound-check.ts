import { FoundryRepository } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const [emailArg, domainArg] = process.argv.slice(2);
const email = emailArg?.trim() || undefined;
const inferredDomain = email?.includes("@") ? email.split("@").at(-1) : undefined;
const domain = domainArg?.trim() || inferredDomain;

if (!email && !domain) {
  throw new Error("Usage: npm run outbound:check -- [email] [domain]");
}

const db = PostgresClient.fromConnectionString(connectionString);
const repository = new FoundryRepository(db);

try {
  const decision = await repository.evaluateOutboundPermission({
    email,
    domain,
    manualApproved: false
  });
  console.log(JSON.stringify({ email, domain, ...decision }, null, 2));
  if (!decision.allowed) process.exitCode = 2;
} finally {
  await db.close();
}
