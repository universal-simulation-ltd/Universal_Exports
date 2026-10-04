import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isImageDataUrl } from "./safeDataUrl";

// "Sign together, live": the drafter and the other party on one Supabase
// Realtime channel for a signing link. Broadcast + presence only — nothing is
// written to the database, and nothing here is the record: the signature that
// counts is still the one submitted through exports-sign, with its audit trail.
//
// What travels:
//   presence  { role, name }                    — who is here
//   focus     { field }                         — which part of the page each
//                                                 side is on (or pointing at)
//   draft     { name }                          — the signer's name as typed
//   ink       { dataUrl }                       — a signature, stroke by stroke
//   opened    {}                                — the signer opened the document
//   signed    {}                                — the signer submitted
//
// The channel is named from a SHA-256 of the signing token, so only someone who
// holds the link can find it (the link is already the credential for signing).
// Everything received is checked before it is shown: a field from the list, a
// name of at most 200 characters, a PNG/JPEG/WebP data URL under 400 KB.

export type TogetherRole = "drafter" | "signer";
export const TOGETHER_FIELDS = ["document", "name", "signature", "submit"] as const;
export type TogetherField = (typeof TOGETHER_FIELDS)[number];

export interface PeerState {
  present: boolean;
  name: string;
  focus: TogetherField | null;
  draftName: string;
  ink: string;
  opened: boolean;
  signed: boolean;
}

const EMPTY: PeerState = { present: false, name: "", focus: null, draftName: "", ink: "", opened: false, signed: false };
const MAX_INK = 400_000;

export async function togetherChannelName(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`exports-together:${token}`));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `exports-together:${hex.slice(0, 32)}`;
}

/** Keep only what a peer is allowed to put on our screen. */
export function cleanEvent(event: string, payload: unknown): Partial<PeerState> | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (event) {
    case "focus":
      return { focus: TOGETHER_FIELDS.includes(p.field as TogetherField) ? (p.field as TogetherField) : null };
    case "draft":
      return typeof p.name === "string" ? { draftName: p.name.slice(0, 200) } : null;
    case "ink":
      if (p.dataUrl === "") return { ink: "" };
      return typeof p.dataUrl === "string" && p.dataUrl.length <= MAX_INK && isImageDataUrl(p.dataUrl)
        ? { ink: p.dataUrl }
        : null;
    case "opened":
      return { opened: true };
    case "signed":
      return { signed: true };
    default:
      return null;
  }
}

/**
 * Join the live session for `token` as `role`. `enabled` false leaves it.
 * Returns the OTHER side's state and senders for our own.
 */
export function useSignTogether(opts: { token: string; role: TogetherRole; name: string; enabled: boolean }) {
  const { token, role, name, enabled } = opts;
  const [peer, setPeer] = useState<PeerState>(EMPTY);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // What we last sent, so a late joiner is brought up to date on arrival.
  const mine = useRef<{ focus: TogetherField | null; draft: string; ink: string; opened: boolean }>({
    focus: null, draft: "", ink: "", opened: false,
  });
  const nameRef = useRef(name);
  nameRef.current = name;

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event, payload });
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const other: TogetherRole = role === "drafter" ? "signer" : "drafter";

    void togetherChannelName(token).then((topic) => {
      if (cancelled) return;
      channel = supabase.channel(topic, {
        config: { broadcast: { self: false }, presence: { key: `${role}-${crypto.randomUUID().slice(0, 8)}` } },
      });
      channelRef.current = channel;

      const replay = () => {
        const m = mine.current;
        if (m.focus) send("focus", { field: m.focus });
        if (m.draft) send("draft", { name: m.draft });
        if (m.ink) send("ink", { dataUrl: m.ink });
        if (m.opened) send("opened", {});
      };

      channel.on("presence", { event: "sync" }, () => {
        const state = channel!.presenceState<{ role?: string; name?: string }>();
        const others = Object.values(state).flat().filter((m) => m.role === other);
        setPeer((p) => ({ ...p, present: others.length > 0, name: String(others[0]?.name ?? "").slice(0, 120) }));
      });
      channel.on("presence", { event: "join" }, ({ newPresences }) => {
        if (newPresences.some((m) => (m as { role?: string }).role === other)) replay();
      });
      for (const ev of ["focus", "draft", "ink", "opened", "signed"]) {
        channel.on("broadcast", { event: ev }, ({ payload }) => {
          const patch = cleanEvent(ev, payload);
          if (patch) setPeer((p) => ({ ...p, ...patch }));
        });
      }
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel!.track({ role, name: nameRef.current.slice(0, 120) });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnected(false);
        }
      });
    });

    return () => {
      cancelled = true;
      setConnected(false);
      setPeer(EMPTY);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, token, role, send]);

  // Throttle the name: one message per 200 ms while typing, and the last one always.
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendDraft = useCallback((value: string) => {
    mine.current.draft = value.slice(0, 200);
    if (draftTimer.current) return;
    draftTimer.current = setTimeout(() => {
      draftTimer.current = null;
      send("draft", { name: mine.current.draft });
    }, 200);
  }, [send]);

  return {
    connected,
    peer,
    focus: useCallback((field: TogetherField | null) => {
      mine.current.focus = field;
      send("focus", { field });
    }, [send]),
    draft: sendDraft,
    ink: useCallback((dataUrl: string) => {
      if (dataUrl && (dataUrl.length > MAX_INK || !isImageDataUrl(dataUrl))) return;
      mine.current.ink = dataUrl;
      send("ink", { dataUrl });
    }, [send]),
    opened: useCallback(() => {
      mine.current.opened = true;
      send("opened", {});
    }, [send]),
    signed: useCallback(() => send("signed", {}), [send]),
  };
}
