import { applyMigrations, loadMigrations } from "../db/migrations.js";
import { PostgresClient } from "../db/postgres.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = PostgresClient.fromConnectionString(connectionString);
try {
  const migrations = await loadMigrations();
  const applied = await applyMigrations(db, migrations);
  console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database already current.");
} finally {
  await db.close();
}
