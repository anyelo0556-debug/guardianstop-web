import { describe, expect, it } from "vitest";
import {
  isIGAccountPollingAllowed,
  LIVE_IG_GOVERNANCE_READY_FLAG,
  LIVE_IG_WORKER_ENABLE_FLAG,
} from "./ig-worker-safety";

describe("IG polling safety gate", () => {
  it("keeps demo accounts available for isolated testing", () => {
    expect(isIGAccountPollingAllowed(true, {})).toBe(true);
  });

  it("blocks live accounts by default", () => {
    expect(isIGAccountPollingAllowed(false, {})).toBe(false);
  });

  it("requires both explicit live enablement and verified governance", () => {
    expect(isIGAccountPollingAllowed(false, {
      [LIVE_IG_WORKER_ENABLE_FLAG]: "true",
    })).toBe(false);
    expect(isIGAccountPollingAllowed(false, {
      [LIVE_IG_GOVERNANCE_READY_FLAG]: "true",
    })).toBe(false);
  });

  it("allows live polling only when both readiness flags are exactly true", () => {
    expect(isIGAccountPollingAllowed(false, {
      [LIVE_IG_WORKER_ENABLE_FLAG]: "true",
      [LIVE_IG_GOVERNANCE_READY_FLAG]: "true",
    })).toBe(true);
    expect(isIGAccountPollingAllowed(false, {
      [LIVE_IG_WORKER_ENABLE_FLAG]: "TRUE",
      [LIVE_IG_GOVERNANCE_READY_FLAG]: "true",
    })).toBe(false);
  });
});
