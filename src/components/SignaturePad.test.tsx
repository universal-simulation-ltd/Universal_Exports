// Scan to sign, step 2 (platform 0306), on the pad: a phone signature with a
// matching `attest` shows "Signed by … via Universal ID"; anything else shows
// nothing extra, and an old phone without `attest` works as before.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useState } from "react";
import type { PhoneAttestation } from "@/lib/phoneAttest";
import { pngBytes, sha256Hex } from "@/lib/phoneAttest";

type Handler = (msg: { payload: unknown }) => void;
const handlers: Record<string, Handler> = {};
let channelName = "";
const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: (name: string) => {
      channelName = name;
      const ch = {
        on: (_type: string, { event }: { event: string }, fn: Handler) => { handlers[event] = fn; return ch; },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: async () => {},
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));
vi.mock("@unisim/sdk", () => ({
  UnisimQr: () => null,
  useDefaultView: () => ({ defaultView: "mobile", buttonProps: () => ({}), tap: () => {} }),
  useLanguage: () => ({ language: "en-gb" }),
  languageFallbacks: (l: string) => [l, "en"],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import SignaturePad from "./SignaturePad";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const OTHER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGB60e6kgAAAABJRU5ErkJggg==";
const CERT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

// The parent, as the workflow and the counter-sign page hold it.
function Host() {
  const [value, setValue] = useState("");
  const [attestation, setAttestation] = useState<PhoneAttestation | null>(null);
  return <SignaturePad value={value} onChange={setValue} attestation={attestation} onAttestation={setAttestation} />;
}

async function sendFromPhone(attest: string | undefined, recordFor = PNG) {
  const token = channelName.replace("mobile-sig:", "");
  rpc.mockResolvedValue({
    data: {
      ok: true, cert_id: CERT, signer_email: "hub.signer@example.com", app: "exports",
      channel_sha256: await sha256Hex(token), png_sha256: await sha256Hex(pngBytes(recordFor)!),
      signed_at: "2026-10-22T14:07:00+00:00",
    },
    error: null,
  });
  const pin = screen.getByText(/^\d{6}$/).textContent;
  await act(async () => {
    handlers.signature({ payload: { pin, signature: PNG, ...(attest ? { attest } : {}) } });
  });
  // Let the lookup and the re-check settle.
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

describe("SignaturePad: Scan to sign attestation", () => {
  beforeEach(() => { rpc.mockReset(); channelName = ""; });

  it("shows who signed when the attestation matches this channel and image", async () => {
    render(<Host />);
    await sendFromPhone(CERT);
    expect(rpc).toHaveBeenCalledWith("verify_phone_sign_attestation", { p_cert: CERT });
    const line = await screen.findByTestId("phone-attested");
    expect(line.textContent).toMatch(/Signed by hub\.signer@example\.com via Universal ID · /);
    expect(screen.getByRole("link", { name: "Check" }).getAttribute("href")).toBe(`https://app.unisim.co.uk/check?attest=${CERT}`);
    // Clearing the signature drops it.
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    await act(async () => {});
    expect(screen.queryByTestId("phone-attested")).toBeNull();
  });

  it("shows nothing extra when the record is for another image", async () => {
    render(<Host />);
    await sendFromPhone(CERT, OTHER);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("phone-attested")).toBeNull();
  });

  it("works as before for a phone that sends no attest", async () => {
    render(<Host />);
    await sendFromPhone(undefined);
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.queryByTestId("phone-attested")).toBeNull();
    expect(screen.getByText("Signature received.")).toBeTruthy();
  });
});
