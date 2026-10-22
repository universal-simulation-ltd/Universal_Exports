// Scan to sign, step 2 (platform 0306): a phone's `attest` is believed only
// when the record matches this desktop's channel token and the PNG it
// received, and nothing is printed otherwise.
import { describe, it, expect } from "vitest";
import {
  ATTEST_CHECK_URL,
  attestationForPrint,
  parseStoredAttestation,
  pngBytes,
  sha256Hex,
  verifyPhoneAttestation,
  type AttestRpc,
} from "./phoneAttest";

// A real 1×1 PNG, and a different one (one byte of the pixel data changed).
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const OTHER_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGB60e6kgAAAABJRU5ErkJggg==";
const PNG = `data:image/png;base64,${PNG_B64}`;
const OTHER = `data:image/png;base64,${OTHER_B64}`;
// Exports' token: 8 random bytes as hex.
const TOKEN = "0123456789abcdef";
const CERT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

async function row(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    cert_id: CERT,
    signer_email: "signer@example.com",
    app: "exports",
    channel_sha256: await sha256Hex(TOKEN),
    png_sha256: await sha256Hex(pngBytes(PNG)!),
    signed_at: "2026-10-22T14:07:30.123+00:00",
    ...over,
  };
}

function rpcReturning(data: unknown, error: unknown = null) {
  const calls: unknown[] = [];
  const rpc: AttestRpc = (fn, args) => { calls.push([fn, args]); return Promise.resolve({ data, error }); };
  return { rpc, calls };
}

const base = { attest: CERT, channelToken: TOKEN, signature: PNG, app: "exports" as const };

describe("hashing", () => {
  it("hashes the token as UTF-8 and the PNG as decoded bytes", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex(pngBytes(PNG)!)).toBe(await sha256Hex(pngBytes(PNG_B64)!));
    expect(await sha256Hex(pngBytes(PNG)!)).not.toBe(await sha256Hex(pngBytes(OTHER)!));
  });

  it("has no bytes for anything that isn't a PNG", () => {
    expect(pngBytes("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBeNull();
    expect(pngBytes(`data:image/png;base64,${btoa("not a png")}`)).toBeNull();
    expect(pngBytes("not base64!")).toBeNull();
  });
});

describe("verifyPhoneAttestation", () => {
  it("accepts a record for this channel, this image and this app", async () => {
    const { rpc, calls } = rpcReturning(await row());
    const a = await verifyPhoneAttestation(rpc, base);
    expect(calls).toEqual([["verify_phone_sign_attestation", { p_cert: CERT }]]);
    expect(a).toMatchObject({ certId: CERT, signerEmail: "signer@example.com", checkUrl: `https://app.unisim.co.uk/check?attest=${CERT}` });
    expect(a?.checkUrl).toBe(ATTEST_CHECK_URL + CERT);
  });

  it.each([
    ["another channel", { channel_sha256: "0".repeat(64) }, {}],
    ["another image", {}, { signature: OTHER }],
    ["another app", { app: "signatures" }, {}],
    ["not ok", { ok: false }, {}],
    ["no email", { signer_email: "" }, {}],
    ["no time", { signed_at: null }, {}],
    ["another cert", { cert_id: "f".repeat(32) }, {}],
  ])("refuses %s", async (_name, over, args) => {
    expect(await verifyPhoneAttestation(rpcReturning(await row(over)).rpc, { ...base, ...args })).toBeNull();
  });

  it("refuses when the lookup fails or throws", async () => {
    expect(await verifyPhoneAttestation(rpcReturning(null, { message: "offline" }).rpc, base)).toBeNull();
    expect(await verifyPhoneAttestation(() => Promise.reject(new Error("boom")), base)).toBeNull();
  });

  it("makes no lookup for a missing or malformed attest (older phones)", async () => {
    for (const attest of [undefined, null, "", "nope", CERT.toUpperCase(), 42]) {
      const { rpc, calls } = rpcReturning(await row());
      expect(await verifyPhoneAttestation(rpc, { ...base, attest })).toBeNull();
      expect(calls).toHaveLength(0);
    }
  });
});

describe("what gets printed", () => {
  it("prints the line for the attested image", async () => {
    const a = await verifyPhoneAttestation(rpcReturning(await row()).rpc, base);
    expect(await attestationForPrint(a, PNG)).toEqual({
      line: "Signed by signer@example.com via Universal ID · 22 Oct 2026, 14:07 UTC",
      checkUrl: `https://app.unisim.co.uk/check?attest=${CERT}`,
    });
  });

  it("prints nothing on a mismatch", async () => {
    // Refused by the lookup…
    const refused = await verifyPhoneAttestation(rpcReturning(await row({ png_sha256: "0".repeat(64) })).rpc, base);
    expect(await attestationForPrint(refused, PNG)).toBeNull();
    // …or verified, then the signature was redrawn before signing.
    const a = await verifyPhoneAttestation(rpcReturning(await row()).rpc, base);
    expect(await attestationForPrint(a, OTHER)).toBeNull();
    expect(await attestationForPrint(a, "")).toBeNull();
  });

  it("survives being kept with the project, and rejects a tampered copy", async () => {
    const a = await verifyPhoneAttestation(rpcReturning(await row()).rpc, base);
    const back = parseStoredAttestation(JSON.stringify(a));
    expect(back).toEqual(a);
    expect(await attestationForPrint(back, PNG)).not.toBeNull();
    // A stored copy can't redirect the check link or skip the image check.
    expect(parseStoredAttestation(JSON.stringify({ ...a, checkUrl: "https://evil.example" }))?.checkUrl).toBe(ATTEST_CHECK_URL + CERT);
    expect(await attestationForPrint(parseStoredAttestation(JSON.stringify({ ...a, pngSha256: "0".repeat(64) })), PNG)).toBeNull();
    expect(parseStoredAttestation("{not json")).toBeNull();
    expect(parseStoredAttestation("")).toBeNull();
  });
});

describe("the agreement PDF", () => {
  async function pdfText(attest?: { line: string; checkUrl: string }) {
    const { buildAgreementPdf } = await import("./exportAgreementPdf");
    const built = await buildAgreementPdf({
      projectName: "Test",
      role: "seller",
      fields: [],
      products: [],
      totals: { currency: "GBP", amount: "0" },
      signature: { name: "Drafter", dataUrl: PNG, date: "22 October 2026", attest },
    });
    URL.revokeObjectURL(built.url);
    return new TextDecoder("latin1").decode(await built.blob.arrayBuffer());
  }

  it("prints the line and the check URL only when given one", async () => {
    const a = await verifyPhoneAttestation(rpcReturning(await row()).rpc, base);
    const withIt = await pdfText((await attestationForPrint(a, PNG)) ?? undefined);
    expect(withIt).toContain("signer@example.com via Universal ID");
    expect(withIt).toContain("https://app.unisim.co.uk/check?attest=");
    const without = await pdfText((await attestationForPrint(a, OTHER)) ?? undefined);
    expect(without).not.toContain("signer@example.com");
    expect(without).not.toContain("check?attest=");
  });
});
