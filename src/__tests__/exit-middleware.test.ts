import { describe, it, expect, vi } from "vitest";
import { createExitOnFinish, withExitMarker } from "../exit-middleware.js";
import { ExitType } from "cellar-door-exit";

describe("createExitOnFinish", () => {
  it("returns a function", () => {
    const onFinish = createExitOnFinish({ origin: "test" });
    expect(typeof onFinish).toBe("function");
  });

  it("produces an EXIT marker on call", async () => {
    const onFinish = createExitOnFinish({ origin: "my-agent" });
    const result = await onFinish({ text: "done" });
    expect(result.exitMarkerId).toBeTruthy();
    expect(result.exitMarker).toContain("my-agent");
  });

  it("calls onMarkerCreated callback", async () => {
    const callback = vi.fn();
    const onFinish = createExitOnFinish({
      origin: "test",
      onMarkerCreated: callback,
    });
    await onFinish({ text: "done" });
    expect(callback).toHaveBeenCalledOnce();
    const [marker, identity] = callback.mock.calls[0];
    expect(marker.id).toBeTruthy();
    expect(identity.did).toMatch(/^did:key:/);
  });

  it("respects exitType option", async () => {
    const callback = vi.fn();
    const onFinish = createExitOnFinish({
      origin: "test",
      exitType: ExitType.Forced,
      onMarkerCreated: callback,
    });
    await onFinish({ text: "done" });
    expect(callback.mock.calls[0][0].exitType).toBe("forced");
  });
});

describe("withExitMarker", () => {
  it("wraps an existing onFinish and also creates a marker", async () => {
    const original = vi.fn();
    const markerCb = vi.fn();
    const wrapped = withExitMarker(original, {
      origin: "test",
      onMarkerCreated: markerCb,
    });
    await wrapped({ text: "hi" });
    expect(original).toHaveBeenCalledOnce();
    expect(markerCb).toHaveBeenCalledOnce();
  });

  it("works with undefined original", async () => {
    const markerCb = vi.fn();
    const wrapped = withExitMarker(undefined, {
      origin: "test",
      onMarkerCreated: markerCb,
    });
    await wrapped({ text: "hi" });
    expect(markerCb).toHaveBeenCalledOnce();
  });
});
