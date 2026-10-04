import { describe, it, expect } from "vitest";
import { cleanEvent, togetherChannelName } from "./together";

describe("cleanEvent — what a peer may put on our screen", () => {
  it("keeps known fields and drops anything else", () => {
    expect(cleanEvent("focus", { field: "signature" })).toEqual({ focus: "signature" });
    expect(cleanEvent("focus", { field: "<img onerror>" })).toEqual({ focus: null });
  });
  it("caps a typed name", () => {
    expect(cleanEvent("draft", { name: "x".repeat(500) })?.draftName).toHaveLength(200);
    expect(cleanEvent("draft", { name: 42 })).toBeNull();
  });
  it("accepts only image data URLs as ink", () => {
    expect(cleanEvent("ink", { dataUrl: "data:image/png;base64,iVBORw0KGgo=" })).toEqual({ ink: "data:image/png;base64,iVBORw0KGgo=" });
    expect(cleanEvent("ink", { dataUrl: "data:text/html;base64,PGgxPg==" })).toBeNull();
    expect(cleanEvent("ink", { dataUrl: "javascript:alert(1)" })).toBeNull();
    expect(cleanEvent("ink", { dataUrl: "data:image/png;base64," + "A".repeat(500_000) })).toBeNull();
    expect(cleanEvent("ink", { dataUrl: "" })).toEqual({ ink: "" });
  });
  it("ignores unknown events", () => {
    expect(cleanEvent("delete-everything", {})).toBeNull();
  });
});

describe("togetherChannelName", () => {
  it("never carries the signing token itself", async () => {
    const token = "dddddddd-0000-4000-8000-00000000e2e4";
    const name = await togetherChannelName(token);
    expect(name).toMatch(/^exports-together:[0-9a-f]{32}$/);
    expect(name).not.toContain("dddddddd");
  });
});
