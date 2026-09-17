import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../src/domain/state.js";

describe("DexFoundry state machine", () => {
  it("allows the normal acquisition path", () => {
    expect(canTransition("DISCOVERED", "SIGNAL_DETECTED")).toBe(true);
    expect(canTransition("POC_APPROVED", "OUTREACH_READY")).toBe(true);
    expect(canTransition("ACTIVE", "RENEWAL")).toBe(true);
  });

  it("blocks impossible jumps", () => {
    expect(canTransition("DISCOVERED", "WON")).toBe(false);
    expect(() => assertTransition("DISCOVERED", "WON")).toThrow(/Illegal DexFoundry transition/);
  });

  it("keeps do-not-contact terminal", () => {
    expect(canTransition("DO_NOT_CONTACT", "CONTACTED")).toBe(false);
  });
});
