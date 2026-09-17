import { describe, expect, it } from "vitest";
import { applyMigrations, type Migration } from "../src/db/migrations.js";
import type { SqlClient, SqlExecutor, SqlResult } from "../src/db/sql.js";

class FakeDb implements SqlClient, SqlExecutor {
  readonly calls: string[] = [];
  readonly applied = new Set<string>();

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = []
  ): Promise<SqlResult<Row>> {
    this.calls.push(text.trim().split("\n")[0]);
    if (text.startsWith("SELECT id FROM dexfoundry_migrations")) {
      const id = String(params[0]);
      const rows = this.applied.has(id) ? ([{ id }] as unknown as Row[]) : [];
      return { rows, rowCount: rows.length };
    }
    if (text.startsWith("INSERT INTO dexfoundry_migrations")) {
      this.applied.add(String(params[0]));
    }
    return { rows: [], rowCount: 0 };
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return work(this);
  }
}

const migrations: Migration[] = [
  { id: "002_second.sql", sql: "SELECT 2" },
  { id: "001_first.sql", sql: "SELECT 1" }
];

describe("migration runner", () => {
  it("applies migrations in lexical order and does not reapply them", async () => {
    const db = new FakeDb();
    expect(await applyMigrations(db, migrations)).toEqual(["001_first.sql", "002_second.sql"]);
    expect(await applyMigrations(db, migrations)).toEqual([]);
  });

  it("rejects duplicate migration ids", async () => {
    const db = new FakeDb();
    await expect(applyMigrations(db, [migrations[0], migrations[0]])).rejects.toThrow(/Duplicate migration id/);
  });
});
