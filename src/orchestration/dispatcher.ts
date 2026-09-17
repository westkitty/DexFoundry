import type { OutboxItem } from "../db/foundryRepository.js";
import type { WorkflowEnvelope } from "./contracts.js";
import {
  DEXFOUNDRY_IDEMPOTENCY_HEADER,
  DEXFOUNDRY_SIGNATURE_HEADER,
  DEXFOUNDRY_TIMESTAMP_HEADER,
  assertWebhookSecret,
  signWebhookBody
} from "./webhook.js";

export interface DispatchRepository {
  requeueStaleOutbox(staleAfterSeconds?: number): Promise<number>;
  claimOutbox(limit?: number): Promise<OutboxItem[]>;
  markOutboxPublished(id: string): Promise<void>;
  releaseOutbox(id: string, error: string, retryDelaySeconds?: number): Promise<void>;
}

export interface WebhookResponse {
  status: number;
  body: string;
}

export interface WebhookTransport {
  post(url: string, body: string, headers: Record<string, string>): Promise<WebhookResponse>;
}

export class FetchWebhookTransport implements WebhookTransport {
  constructor(private readonly timeoutMs = 15_000) {}

  async post(url: string, body: string, headers: Record<string, string>): Promise<WebhookResponse> {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    return { status: response.status, body: (await response.text()).slice(0, 2000) };
  }
}

export interface DispatchSummary {
  reclaimed: number;
  claimed: number;
  published: number;
  released: number;
}

export class OutboxDispatcher {
  constructor(
    private readonly repository: DispatchRepository,
    private readonly endpoint: string,
    private readonly secret: string,
    private readonly transport: WebhookTransport = new FetchWebhookTransport(),
    private readonly now: () => number = () => Date.now()
  ) {
    assertWebhookSecret(secret);
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      throw new Error("Production webhook endpoints must use HTTPS");
    }
  }

  async dispatchBatch(limit = 50): Promise<DispatchSummary> {
    const reclaimed = await this.repository.requeueStaleOutbox(900);
    const items = await this.repository.claimOutbox(limit);
    let published = 0;
    let released = 0;

    for (const item of items) {
      const envelope = toWorkflowEnvelope(item);
      const body = JSON.stringify(envelope);
      const timestamp = String(Math.floor(this.now() / 1000));
      const signature = signWebhookBody(this.secret, timestamp, body);

      try {
        const response = await this.transport.post(this.endpoint, body, {
          "content-type": "application/json",
          [DEXFOUNDRY_TIMESTAMP_HEADER]: timestamp,
          [DEXFOUNDRY_SIGNATURE_HEADER]: signature,
          [DEXFOUNDRY_IDEMPOTENCY_HEADER]: item.idempotency_key
        });

        if (response.status >= 200 && response.status < 300) {
          await this.repository.markOutboxPublished(item.id);
          published += 1;
        } else {
          await this.repository.releaseOutbox(
            item.id,
            `Webhook returned HTTP ${response.status}: ${response.body}`,
            retryDelaySeconds(item.attempts)
          );
          released += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.repository.releaseOutbox(item.id, message, retryDelaySeconds(item.attempts));
        released += 1;
      }
    }

    return { reclaimed, claimed: items.length, published, released };
  }
}

export function toWorkflowEnvelope(item: OutboxItem): WorkflowEnvelope {
  return {
    schemaVersion: "1",
    outboxId: item.id,
    eventId: item.event_id,
    idempotencyKey: item.idempotency_key,
    topic: item.topic,
    companyId: item.company_id,
    occurredAt: item.created_at,
    payload: item.payload
  };
}

export function retryDelaySeconds(attempts: number): number {
  const safeAttempts = Math.max(1, Math.min(9, Math.floor(attempts)));
  return Math.min(3600, 15 * 2 ** (safeAttempts - 1));
}
