import type { OutboundDecision } from "./policy.js";

export interface OutboundPermissionEvaluator {
  evaluateOutboundPermission(input: {
    email?: string;
    domain?: string;
    manualApproved?: boolean;
  }): Promise<OutboundDecision>;
}

export interface OutboundMessage {
  to: string;
  domain?: string;
  subject: string;
  body: string;
}

export interface OutboundTransport {
  send(message: OutboundMessage): Promise<{ messageId: string }>;
}

export interface GuardedSendResult {
  sent: boolean;
  decision: OutboundDecision;
  messageId?: string;
}

export async function guardedOutboundSend(
  evaluator: OutboundPermissionEvaluator,
  transport: OutboundTransport,
  message: OutboundMessage,
  options: { manualApproved?: boolean } = {}
): Promise<GuardedSendResult> {
  const inferredDomain = message.to.includes("@") ? message.to.split("@").at(-1) : undefined;
  const decision = await evaluator.evaluateOutboundPermission({
    email: message.to,
    domain: message.domain ?? inferredDomain,
    manualApproved: options.manualApproved
  });

  if (!decision.allowed) {
    return { sent: false, decision };
  }

  const delivered = await transport.send(message);
  return {
    sent: true,
    decision,
    messageId: delivered.messageId
  };
}
