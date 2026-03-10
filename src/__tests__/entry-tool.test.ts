import { describe, it, expect } from "vitest";
import { createEntryTool, createPassageTool } from "../entry-tool.js";
import { quickExit, toJSON } from "cellar-door-exit";

function makeExitMarkerJson(origin = "test-origin") {
  const { marker } = quickExit(origin);
  return toJSON(marker);
}

const toolCtx = { toolCallId: "t1", messages: [], abortSignal: undefined as any };

describe("createEntryTool", () => {
  it("creates a tool with correct description", () => {
    const t = createEntryTool({ destination: "my-app" });
    expect(t.description).toContain("my-app");
    expect(t.description).toContain("CAUTIOUS");
  });

  it("admits a valid EXIT marker with OPEN_DOOR policy", async () => {
    const t = createEntryTool({ destination: "dest", policy: "OPEN_DOOR" });
    const exitJson = makeExitMarkerJson("source");
    const result = await t.execute({ exitMarkerJson: exitJson }, toolCtx);
    expect(result.admitted).toBe(true);
    expect(result.arrivalMarkerJson).toBeTruthy();
    expect(result.destination).toBe("dest");
    expect(result.exitMarkerId).toBeTruthy();
  });

  it("rejects with STRICT policy when lineage is missing", async () => {
    const t = createEntryTool({ destination: "dest", policy: "STRICT" });
    const exitJson = makeExitMarkerJson("source");
    const result = await t.execute({ exitMarkerJson: exitJson }, toolCtx);
    expect(result.admitted).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.arrivalMarkerJson).toBeNull();
  });

  it("defaults to CAUTIOUS policy", () => {
    const t = createEntryTool({ destination: "x" });
    expect(t.description).toContain("CAUTIOUS");
  });

  it("throws on unknown policy", () => {
    expect(() => createEntryTool({ destination: "x", policy: "YOLO" as any })).toThrow("Unknown admission policy");
  });
});

describe("createPassageTool", () => {
  it("performs exit and entry in one step with OPEN_DOOR", async () => {
    const t = createPassageTool({ origin: "alpha", destination: "beta", policy: "OPEN_DOOR" });
    const result = await t.execute({ reason: "transfer" }, toolCtx);
    expect(result.admitted).toBe(true);
    expect(result.exitMarkerJson).toBeTruthy();
    expect(result.arrivalMarkerJson).toBeTruthy();
    expect(result.origin).toBe("alpha");
    expect(result.destination).toBe("beta");
    expect(result.exitMarkerId).toBeTruthy();
  });

  it("exits but rejects entry with EMERGENCY_ONLY policy", async () => {
    const t = createPassageTool({ origin: "alpha", destination: "beta", policy: "EMERGENCY_ONLY" });
    const result = await t.execute({}, toolCtx);
    expect(result.admitted).toBe(false);
    expect(result.exitMarkerJson).toBeTruthy(); // exit still happened
    expect(result.arrivalMarkerJson).toBeNull();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("includes description with origin and destination", () => {
    const t = createPassageTool({ origin: "src", destination: "dst" });
    expect(t.description).toContain("src");
    expect(t.description).toContain("dst");
  });
});
