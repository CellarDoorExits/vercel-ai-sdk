import { describe, it, expect } from "vitest";
import { verifyExitMarkerTool, verifyToolParams } from "../verify-tool.js";
import { quickExit, toJSON } from "cellar-door-exit";

describe("verifyExitMarkerTool", () => {
  it("has a description", () => {
    expect(verifyExitMarkerTool.description).toBeTruthy();
  });

  it("validates a valid marker", async () => {
    const { marker } = await quickExit("test-platform");
    const markerJson = toJSON(marker);

    const result = await verifyExitMarkerTool.execute(
      { markerJson },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.markerId).toBe(marker.id);
  });

  it("rejects invalid JSON", async () => {
    const result = await verifyExitMarkerTool.execute(
      { markerJson: "not-json" },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
