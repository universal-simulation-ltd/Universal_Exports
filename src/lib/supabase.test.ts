import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adoptLegacySession,
  bindSuiteClient,
  isSuiteClientBound,
  legacySessionKey,
  parseLegacySession,
  supabase,
} from "./supabase";

const SESSION = JSON.stringify({ access_token: "a.b.c", refresh_token: "r1", user: { id: "u1" } });

function fakeClient(setSession = vi.fn(async () => ({ error: null }))) {
  const client = {
    tag: "suite",
    rpc(this: { tag: string }, name: string) { return `${this.tag}:${name}`; },
    auth: { setSession },
  };
  return client as unknown as SupabaseClient & { tag: string };
}

describe("the one Supabase client", () => {
  it("forwards to the suite client once bound, with `this` intact", () => {
    const client = fakeClient();
    bindSuiteClient(client);
    expect(isSuiteClientBound()).toBe(true);
    expect((supabase.rpc as unknown as (n: string) => string)("x")).toBe("suite:x");
    expect(supabase.auth).toBe(client.auth);
  });
});

describe("legacySessionKey", () => {
  it("is supabase-js's default key for the project", () => {
    expect(legacySessionKey("https://rygfxgalojojppxmhddo.supabase.co")).toBe("sb-rygfxgalojojppxmhddo-auth-token");
  });
  it("is null for a URL it can't read", () => {
    expect(legacySessionKey("not a url")).toBeNull();
  });
});

describe("parseLegacySession", () => {
  it("reads a v2 session", () => {
    expect(parseLegacySession(SESSION)).toEqual({ access_token: "a.b.c", refresh_token: "r1" });
  });
  it("reads the old wrapped shape", () => {
    expect(parseLegacySession(JSON.stringify({ currentSession: JSON.parse(SESSION) }))).toEqual({
      access_token: "a.b.c",
      refresh_token: "r1",
    });
  });
  it("refuses anything without both tokens", () => {
    expect(parseLegacySession(null)).toBeNull();
    expect(parseLegacySession("{")).toBeNull();
    expect(parseLegacySession(JSON.stringify({ access_token: "a" }))).toBeNull();
  });
});

describe("adoptLegacySession", () => {
  const key = legacySessionKey()!;
  beforeEach(() => localStorage.clear());

  it("moves an old app-only session to the suite client and clears it", async () => {
    if (!key) return; // no project URL in this environment
    localStorage.setItem(key, SESSION);
    const setSession = vi.fn(async () => ({ error: null }));
    expect(await adoptLegacySession(fakeClient(setSession), false)).toBe(true);
    expect(setSession).toHaveBeenCalledWith({ access_token: "a.b.c", refresh_token: "r1" });
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("leaves a suite session alone, but still clears the old copy", async () => {
    if (!key) return;
    localStorage.setItem(key, SESSION);
    const setSession = vi.fn(async () => ({ error: null }));
    expect(await adoptLegacySession(fakeClient(setSession), true)).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("does nothing when there is no old session", async () => {
    const setSession = vi.fn(async () => ({ error: null }));
    expect(await adoptLegacySession(fakeClient(setSession), false)).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });
});
