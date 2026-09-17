import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SqlClient } from "./sql.js";

export interface Migration {
  id: string;
  sql: string;
}

export async function loadMigrations(directory = resolve(process.cwd(), "migrations")): Promise<Migration[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^\d+.*\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(files.map(async (id) => ({ id, sql: await readFile(resolve(directory, id), "utf8") })));
}

export async function applyMigrations(db: SqlClient, migrations: readonly Migration[]): Promise<string[]> {
  const ordered = [...migrations].sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set<string>();
  for (const migration of ordered) {
    if (ids.has(migration.id)) throw new Error(`Duplicate migration id: ${migration.id}`);
    ids.add(migration.id);
  }

  return db.transaction(async (tx) => {
    await tx.query(`CREATE TABLE IF NOT EXISTS dexfoundry_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('dexfoundry:migrations'))");

    const applied: string[] = [];
    for (const migration of ordered) {
      const existing = await tx.query<{ id: string }>(
        "SELECT id FROM dexfoundry_migrations WHERE id = $1",
        [migration.id]
      );
      if (existing.rowCount > 0) continue;
      await tx.query(migration.sql);
      await tx.query("INSERT INTO dexfoundry_migrations (id) VALUES ($1)", [migration.id]);
      applied.push(migration.id);
    }
    return applied;
  });
}
