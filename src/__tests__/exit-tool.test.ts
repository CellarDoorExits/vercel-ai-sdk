import { describe, it, expect } from "vitest";
import { exitMarkerTool, exitToolParams } from "../exit-tool.js";

describe("exitMarkerTool", () => {
  it("has a valid tool description", () => {
    expect(exitMarkerTool.description).toBeTruthy();
    expect(exitMarkerTool.description!.length).toBeGreaterThan(20);
  });

  it("has parameters schema with required origin", () => {
    // Vercel AI SDK tool() exposes schema as inputSchema, not parameters
    expect(exitToolParams).toBeDefined();
    const parsed = exitToolParams.parse({
      origin: "test-platform",
    });
    expect(parsed.origin).toBe("test-platform");
  });

  it("rejects missing origin", () => {
    expect(() => exitToolParams.parse({})).toThrow();
  });

  it("accepts optional exitType and reason", () => {
    const parsed = exitToolParams.parse({
      origin: "test",
      exitType: "voluntary",
      reason: "session complete",
    });
    expect(parsed.exitType).toBe("voluntary");
    expect(parsed.reason).toBe("session complete");
  });

  it("execute returns a signed marker", async () => {
    const result = await exitMarkerTool.execute(
      { origin: "test-platform" },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );
    expect(result.markerId).toBeTruthy();
    expect(result.origin).toBe("test-platform");
    expect(result.markerJson).toContain("test-platform");
    expect(result.subject).toMatch(/^did:key:/);
  });

  it("execute respects exitType parameter", async () => {
    const result = await exitMarkerTool.execute(
      { origin: "test", exitType: "forced" },
      { toolCallId: "test", messages: [], abortSignal: undefined as any },
    );
    expect(result.exitType).toBe("forced");
  });
});
