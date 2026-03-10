import { describe, it, expect } from "vitest";
import { counterSignExitMarkerTool } from "../countersign-tool.js";
import { quickExit, toJSON, fromJSON } from "cellar-door-exit";

describe("counterSignExitMarkerTool", () => {
  it("has a description", () => {
    expect(counterSignExitMarkerTool.description).toBeTruthy();
  });

  it("counter-signs a valid marker", async () => {
    const { marker } = await quickExit("test-platform");
    const markerJson = toJSON(marker);

    const result = await counterSignExitMarkerTool.execute(
      { markerJson },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );

    expect(result.witnessDid).toMatch(/^did:key:/);
    expect(result.markerId).toBe(marker.id);
    expect(result.attestation).toBe("Observed departure ceremony");

    // Verify the witness was added
    const updated = fromJSON(result.counterSignedMarkerJson) as any;
    expect(updated.witnesses).toHaveLength(1);
    expect(updated.witnesses[0].witnessDid).toBe(result.witnessDid);
  });

  it("accepts custom attestation", async () => {
    const { marker } = await quickExit("test");
    const markerJson = toJSON(marker);

    const result = await counterSignExitMarkerTool.execute(
      { markerJson, attestation: "Custom attestation" },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );

    expect(result.attestation).toBe("Custom attestation");
  });
});
