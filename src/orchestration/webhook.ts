import { createHmac, timingSafeEqual } from "node:crypto";

export const DEXFOUNDRY_TIMESTAMP_HEADER = "x-dexfoundry-timestamp";
export const DEXFOUNDRY_SIGNATURE_HEADER = "x-dexfoundry-signature";
export const DEXFOUNDRY_IDEMPOTENCY_HEADER = "x-dexfoundry-idempotency-key";

export class WebhookAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookAuthError";
  }
}

export function assertWebhookSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error("Webhook secrets must contain at least 32 characters");
  }
}

export function signWebhookBody(secret: string, timestamp: string, rawBody: string): string {
  assertWebhookSecret(secret);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return `v1=${digest}`;
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowMs?: number;
  maxSkewSeconds?: number;
}): void {
  const {
    secret,
    timestamp,
    signature,
    rawBody,
    nowMs = Date.now(),
    maxSkewSeconds = 300
  } = input;

  assertWebhookSecret(secret);
  if (!timestamp || !signature) throw new WebhookAuthError("Missing DexFoundry webhook authentication headers");

  const parsedTimestamp = Number(timestamp);
  if (!Number.isInteger(parsedTimestamp) || parsedTimestamp <= 0) {
    throw new WebhookAuthError("Invalid DexFoundry webhook timestamp");
  }

  const currentSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(currentSeconds - parsedTimestamp) > maxSkewSeconds) {
    throw new WebhookAuthError("DexFoundry webhook timestamp is outside the allowed replay window");
  }

  const expected = signWebhookBody(secret, timestamp, rawBody);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new WebhookAuthError("Invalid DexFoundry webhook signature");
  }
}
