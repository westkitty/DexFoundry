import { describe, expect, it } from "vitest";
import { signWebhookBody, verifyWebhookSignature, WebhookAuthError } from "../src/orchestration/webhook.js";

const secret = "0123456789abcdef0123456789abcdef";
const timestamp = "1789675200";
const rawBody = JSON.stringify({ hello: "world" });
const nowMs = Number(timestamp) * 1000;

describe("DexFoundry webhook authentication", () => {
  it("accepts a valid signature", () => {
    const signature = signWebhookBody(secret, timestamp, rawBody);
    expect(() => verifyWebhookSignature({ secret, timestamp, signature, rawBody, nowMs })).not.toThrow();
  });

  it("rejects tampered payloads", () => {
    const signature = signWebhookBody(secret, timestamp, rawBody);
    expect(() => verifyWebhookSignature({ secret, timestamp, signature, rawBody: rawBody + "x", nowMs })).toThrow(WebhookAuthError);
  });

  it("rejects stale signed requests", () => {
    const signature = signWebhookBody(secret, timestamp, rawBody);
    expect(() => verifyWebhookSignature({ secret, timestamp, signature, rawBody, nowMs: nowMs + 301_000 })).toThrow(/replay window/);
  });

  it("rejects weak secrets", () => {
    expect(() => signWebhookBody("short", timestamp, rawBody)).toThrow(/at least 32 characters/);
  });
});
