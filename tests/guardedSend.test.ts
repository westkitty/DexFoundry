import { describe, expect, it, vi } from "vitest";
import { guardedOutboundSend } from "../src/outbound/guardedSend.js";

const message = {
  to: "prospect@example.com",
  subject: "Pilot",
  body: "Test body"
};

describe("guardedOutboundSend", () => {
  it("does not invoke the transport when global policy blocks", async () => {
    const evaluator = {
      evaluateOutboundPermission: vi.fn().mockResolvedValue({
        allowed: false,
        mode: "DISABLED" as const,
        blockers: ["GLOBAL_DISABLED" as const]
      })
    };
    const transport = {
      send: vi.fn().mockResolvedValue({ messageId: "should-not-exist" })
    };

    const result = await guardedOutboundSend(evaluator, transport, message, { manualApproved: true });

    expect(result.sent).toBe(false);
    expect(result.messageId).toBeUndefined();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("does not invoke the transport when suppression blocks", async () => {
    const evaluator = {
      evaluateOutboundPermission: vi.fn().mockResolvedValue({
        allowed: false,
        mode: "ENABLED" as const,
        blockers: ["SUPPRESSED" as const]
      })
    };
    const transport = {
      send: vi.fn().mockResolvedValue({ messageId: "should-not-exist" })
    };

    const result = await guardedOutboundSend(evaluator, transport, message);

    expect(result.sent).toBe(false);
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("invokes transport only after an allowed decision", async () => {
    const evaluator = {
      evaluateOutboundPermission: vi.fn().mockResolvedValue({
        allowed: true,
        mode: "MANUAL_ONLY" as const,
        blockers: []
      })
    };
    const transport = {
      send: vi.fn().mockResolvedValue({ messageId: "msg-1" })
    };

    const result = await guardedOutboundSend(evaluator, transport, message, { manualApproved: true });

    expect(result).toMatchObject({ sent: true, messageId: "msg-1" });
    expect(transport.send).toHaveBeenCalledTimes(1);
  });
});
