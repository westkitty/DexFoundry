import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { SqlClient, SqlExecutor, SqlResult } from "./sql.js";

function executorFor(client: Pool | PoolClient): SqlExecutor {
  return {
    async query<Row extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params: readonly unknown[] = []
    ): Promise<SqlResult<Row>> {
      const result = await client.query<Row & QueryResultRow>(text, [...params]);
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    }
  };
}

export class PostgresClient implements SqlClient {
  constructor(private readonly pool: Pool) {}

  static fromConnectionString(connectionString: string): PostgresClient {
    return new PostgresClient(new Pool({ connectionString }));
  }

  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = []
  ): Promise<SqlResult<Row>> {
    return executorFor(this.pool).query<Row>(text, params);
  }

  async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(executorFor(client));
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
