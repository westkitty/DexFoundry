# DexFoundry Outbound Policy

## Current mode

**DISABLED**

External prospect or customer messaging is disabled by default and remains disabled until an explicit later authorization changes the control state.

This is a control-plane rule, not a convention.

## Decision order

Before any outbound sender may deliver a message, DexFoundry must resolve all of the following:

1. Read the global outbound mode from `outbound_controls`.
2. Check recipient email/domain suppression.
3. Apply any mode-specific human approval requirement.
4. Refuse delivery when any blocker remains.

The policy result is deterministic:

- `DISABLED` -> block all outbound messaging.
- `MANUAL_ONLY` -> require explicit manual approval for the individual send and still honor suppression.
- `ENABLED` -> global mode no longer blocks, but suppression still blocks.

A suppression record always wins over an enabled or manually approved send.

## Current operational constraint

No external message should be sent from DexFoundry in the current state.

Preparing internal POCs, evidence, drafts, reports, simulations, fixtures, or read-only permission checks does not count as sending. A transition to an externally visible delivery action does.

## Required proof before adding or enabling a sender

A real sender implementation must not be accepted until CI or equivalent runtime proof demonstrates:

- global `DISABLED` blocks an unsuppressed recipient;
- a suppression blocks in every outbound mode;
- `MANUAL_ONLY` blocks without individual approval;
- `MANUAL_ONLY` can allow only when approval exists and suppression is clear;
- sender code calls the permission decision immediately before the irreversible send edge;
- no alternate sender path bypasses that decision;
- failures default to no-send rather than permissive fallback.

## Read-only check

After migration and build:

```sh
npm run outbound:check -- recipient@example.com example.com
```

The command is intentionally read-only. It prints the current decision and exits non-zero when delivery is blocked. It does not create a contact, alter suppression state, change outbound mode, create a draft, or send a message.

## Authority

Postgres remains canonical for live outbound mode and suppression state. Documentation, n8n, email tools, and AI agents may not override the database decision.
