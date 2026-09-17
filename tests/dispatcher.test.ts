import { describe, expect, it } from "vitest";
import { OutboxDispatcher, retryDelaySeconds, type DispatchRepository, type WebhookTransport } from "../src/orchestration/dispatcher.js";
import type { OutboxItem } from "../src/db/foundryRepository.js";

const secret = "0123456789abcdef0123456789abcdef";
const item: OutboxItem = {
  id: "11111111-1111-1111-1111-111111111111",
  event_id: "22222222-2222-2222-2222-222222222222",
  company_id: "33333333-3333-3333-3333-333333333333",
  topic: "foundry.company.state.changed",
  idempotency_key: "event:22222222-2222-2222-2222-222222222222",
  payload: { stateAfter: "SIGNAL_DETECTED" },
  attempts: 1,
  created_at: "2026-09-17T20:00:00.000Z"
};

class FakeRepository implements DispatchRepository {
  published: string[] = [];
  released: Array<{ id: string; error: string; delay?: number }> = [];
  async requeueStaleOutbox(): Promise<number> { return 2; }
  async claimOutbox(): Promise<OutboxItem[]> { return [item]; }
  async markOutboxPublished(id: string): Promise<void> { this.published.push(id); }
  async releaseOutbox(id: string, error: string, delay?: number): Promise<void> { this.released.push({ id, error, delay }); }
}

class FakeTransport implements WebhookTransport {
  constructor(private readonly status: number) {}
  seen?: { url: string; body: string; headers: Record<string, string> };
  async post(url: string, body: string, headers: Record<string, string>) {
    this.seen = { url, body, headers };
    return { status: this.status, body: this.status === 200 ? "ok" : "nope" };
  }
}

describe("outbox dispatcher", () => {
  it("publishes successful deliveries with a signed envelope", async () => {
    const repo = new FakeRepository();
    const transport = new FakeTransport(200);
    const dispatcher = new OutboxDispatcher(repo, "https://example.invalid/webhook", secret, transport, () => 1789675200000);
    expect(await dispatcher.dispatchBatch()).toEqual({ reclaimed: 2, claimed: 1, published: 1, released: 0 });
    expect(repo.published).toEqual([item.id]);
    expect(transport.seen?.headers["x-dexfoundry-signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(JSON.parse(transport.seen!.body).idempotencyKey).toBe(item.idempotency_key);
  });

  it("releases unsuccessful deliveries for bounded retry", async () => {
    const repo = new FakeRepository();
    const dispatcher = new OutboxDispatcher(repo, "https://example.invalid/webhook", secret, new FakeTransport(503));
    expect(await dispatcher.dispatchBatch()).toEqual({ reclaimed: 2, claimed: 1, published: 0, released: 1 });
    expect(repo.released[0]?.delay).toBe(15);
  });

  it("caps exponential retry delay", () => {
    expect(retryDelaySeconds(1)).toBe(15);
    expect(retryDelaySeconds(20)).toBeLessThanOrEqual(3600);
  });
});
