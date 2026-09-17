import { assertTransition, type LeadState } from "../domain/state.js";
import type { SqlClient, SqlExecutor } from "./sql.js";

interface CompanyRow extends Record<string, unknown> {
  id: string;
  state: LeadState;
  opportunity_score: number;
}

interface EventRow extends Record<string, unknown> {
  id: string;
}

export interface TransitionInput {
  companyId: string;
  to: LeadState;
  source: string;
  confidence?: number;
  payload?: Record<string, unknown>;
}

export interface OutboxItem extends Record<string, unknown> {
  id: string;
  event_id: string;
  company_id: string;
  topic: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export class FoundryRepository {
  constructor(private readonly db: SqlClient) {}

  async transitionCompany(input: TransitionInput): Promise<{ eventId: string; from: LeadState; to: LeadState }> {
    return this.db.transaction(async (tx) => {
      const company = await this.lockCompany(tx, input.companyId);
      assertTransition(company.state, input.to);

      await tx.query(
        "UPDATE companies SET state = $2, updated_at = now() WHERE id = $1",
        [input.companyId, input.to]
      );

      const event = await tx.query<EventRow>(
        `INSERT INTO foundry_events
          (company_id, event_type, state_before, state_after, source, confidence, payload)
         VALUES ($1, 'STATE_TRANSITION', $2, $3, $4, $5, $6::jsonb)
         RETURNING id`,
        [
          input.companyId,
          company.state,
          input.to,
          input.source,
          input.confidence ?? null,
          JSON.stringify(input.payload ?? {})
        ]
      );
      const eventId = requireSingle(event.rows, "state transition event").id;

      await tx.query(
        `INSERT INTO foundry_outbox (event_id, company_id, topic, idempotency_key, payload)
         VALUES ($1::uuid, $2::uuid, 'foundry.company.state.changed', concat('event:', ($1::uuid)::text),
           jsonb_build_object('eventId', ($1::uuid)::text, 'companyId', ($2::uuid)::text,
             'stateBefore', $3::text, 'stateAfter', $4::text, 'source', $5::text))`,
        [eventId, input.companyId, company.state, input.to, input.source]
      );

      return { eventId, from: company.state, to: input.to };
    });
  }

  async recordOpportunityScore(companyId: string, score: number, source: string): Promise<string> {
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new Error(`Opportunity score must be an integer from 0 to 100; got ${score}`);
    }

    return this.db.transaction(async (tx) => {
      await this.lockCompany(tx, companyId);
      await tx.query(
        "UPDATE companies SET opportunity_score = $2, updated_at = now() WHERE id = $1",
        [companyId, score]
      );

      const event = await tx.query<EventRow>(
        `INSERT INTO foundry_events (company_id, event_type, source, payload)
         VALUES ($1, 'OPPORTUNITY_SCORE_UPDATED', $2, jsonb_build_object('score', $3::int))
         RETURNING id`,
        [companyId, source, score]
      );
      const eventId = requireSingle(event.rows, "opportunity score event").id;

      await tx.query(
        `INSERT INTO foundry_outbox (event_id, company_id, topic, idempotency_key, payload)
         VALUES ($1::uuid, $2::uuid, 'foundry.opportunity.scored', concat('event:', ($1::uuid)::text),
           jsonb_build_object('eventId', ($1::uuid)::text, 'companyId', ($2::uuid)::text,
             'score', $3::int, 'source', $4::text))`,
        [eventId, companyId, score, source]
      );

      return eventId;
    });
  }

  async isSuppressed(email?: string, domain?: string): Promise<boolean> {
    if (!email && !domain) return false;
    const result = await this.db.query(
      `SELECT 1 FROM suppressions
       WHERE ($1::text IS NOT NULL AND lower(email) = lower($1))
          OR ($2::text IS NOT NULL AND lower(domain) = lower($2))
       LIMIT 1`,
      [email ?? null, domain ?? null]
    );
    return result.rowCount > 0;
  }

  async claimOutbox(limit = 50): Promise<OutboxItem[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("Outbox claim limit must be 1..500");
    }

    return this.db.transaction(async (tx) => {
      const result = await tx.query<OutboxItem>(
        `WITH candidates AS (
           SELECT id FROM foundry_outbox
           WHERE status = 'PENDING' AND available_at <= now()
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE foundry_outbox o
         SET status = 'PROCESSING', locked_at = now(), attempts = attempts + 1
         FROM candidates c
         WHERE o.id = c.id
         RETURNING o.id, o.event_id, o.company_id, o.topic, o.idempotency_key, o.payload, o.attempts`,
        [limit]
      );
      return result.rows;
    });
  }

  async markOutboxPublished(id: string): Promise<void> {
    await this.db.query(
      "UPDATE foundry_outbox SET status = 'PUBLISHED', published_at = now(), locked_at = NULL, last_error = NULL WHERE id = $1",
      [id]
    );
  }

  async releaseOutbox(id: string, error: string, retryDelaySeconds = 60): Promise<void> {
    if (!Number.isFinite(retryDelaySeconds) || retryDelaySeconds < 0) {
      throw new Error("retryDelaySeconds must be non-negative");
    }
    await this.db.query(
      `UPDATE foundry_outbox
       SET status = 'PENDING', locked_at = NULL, last_error = $2,
           available_at = now() + ($3 * interval '1 second')
       WHERE id = $1`,
      [id, error.slice(0, 2000), retryDelaySeconds]
    );
  }

  private async lockCompany(tx: SqlExecutor, companyId: string): Promise<CompanyRow> {
    const result = await tx.query<CompanyRow>(
      "SELECT id, state, opportunity_score FROM companies WHERE id = $1 FOR UPDATE",
      [companyId]
    );
    return requireSingle(result.rows, `company ${companyId}`);
  }
}

function requireSingle<Row>(rows: readonly Row[], label: string): Row {
  if (rows.length !== 1) throw new Error(`Expected exactly one ${label}; got ${rows.length}`);
  return rows[0];
}
