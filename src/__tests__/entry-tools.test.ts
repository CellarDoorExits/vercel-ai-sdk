import { describe, it, expect } from "vitest";
import { verifyAndAdmitAgentTool, evaluateAdmissionTool, verifyTransferTool } from "../entry-tools.js";
import { quickExit, toJSON } from "cellar-door-exit";

function makeExitMarkerJson(origin = "test-origin") {
  const { marker } = quickExit(origin);
  return toJSON(marker);
}

describe("verifyAndAdmitAgentTool", () => {
  it("has a valid description", () => {
    expect(verifyAndAdmitAgentTool.description).toContain("arrival");
  });

  it("admits a valid EXIT marker and creates arrival", async () => {
    const exitJson = makeExitMarkerJson("source-platform");
    const result = await verifyAndAdmitAgentTool.execute(
      { exitMarkerJson: exitJson, destination: "dest-platform", admissionPolicy: "OPEN_DOOR" },
      { toolCallId: "t1", messages: [], abortSignal: undefined as any },
    );
    expect(result.admitted).toBe(true);
    expect(result.arrivalMarker).toBeTruthy();
    expect(result.destination).toBe("dest-platform");
    expect(result.continuity.valid).toBe(true);
  });

  it("rejects when admission policy fails", async () => {
    const exitJson = makeExitMarkerJson("blocked-origin");
    // STRICT requires voluntary + lineage + stateSnapshot modules
    const result = await verifyAndAdmitAgentTool.execute(
      { exitMarkerJson: exitJson, destination: "dest", admissionPolicy: "STRICT" },
      { toolCallId: "t2", messages: [], abortSignal: undefined as any },
    );
    // STRICT requires lineage+stateSnapshot modules which won't be present
    expect(result.admitted).toBe(false);
    expect(result.reasons!.length).toBeGreaterThan(0);
  });
});

describe("evaluateAdmissionTool", () => {
  it("evaluates OPEN_DOOR policy", async () => {
    const exitJson = makeExitMarkerJson();
    const result = await evaluateAdmissionTool.execute(
      { exitMarkerJson: exitJson, policy: "OPEN_DOOR" },
      { toolCallId: "t3", messages: [], abortSignal: undefined as any },
    );
    expect(result.admitted).toBe(true);
    expect(result.policy).toBe("OPEN_DOOR");
  });

  it("evaluates EMERGENCY_ONLY policy — rejects voluntary", async () => {
    const exitJson = makeExitMarkerJson();
    const result = await evaluateAdmissionTool.execute(
      { exitMarkerJson: exitJson, policy: "EMERGENCY_ONLY" },
      { toolCallId: "t4", messages: [], abortSignal: undefined as any },
    );
    expect(result.admitted).toBe(false);
  });
});

describe("verifyTransferTool", () => {
  it("verifies a valid transfer", async () => {
    const exitJson = makeExitMarkerJson("origin");
    // Create arrival via quickEntry
    const { quickEntry } = await import("cellar-door-entry");
    const entry = quickEntry(exitJson, "destination");
    const arrivalJson = JSON.stringify(entry.arrivalMarker);

    const result = await verifyTransferTool.execute(
      { exitMarkerJson: exitJson, arrivalMarkerJson: arrivalJson },
      { toolCallId: "t5", messages: [], abortSignal: undefined as any },
    );
    expect(result.verified).toBe(true);
    expect(result.transferTime).toBeGreaterThanOrEqual(0);
  });
});
