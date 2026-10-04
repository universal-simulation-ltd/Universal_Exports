import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const list = vi.fn();
vi.mock("@/lib/signatureStore", () => ({
  listSignatureTokens: (...args: unknown[]) => list(...args),
  createSignatureToken: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/translation", async (orig) => ({
  ...(await orig<typeof import("@/lib/translation")>()),
  getTranslation: vi.fn(async () => null),
  deviceTranslation: vi.fn(async () => "unavailable"),
}));
vi.mock("@/lib/auditStore", () => ({
  finaliseSignature: vi.fn(),
  getFinalPdf: vi.fn(),
  markSent: vi.fn(),
  getSignerDocument: vi.fn(async () => null),
  shortHash: (s: string) => `${s.slice(0, 8)}…${s.slice(-8)}`,
}));
vi.mock("@unisim/sdk", () => ({
  UnisimQr: () => null,
  useLanguage: () => ({ language: "en-gb" }),
  languageFallbacks: (l: string) => [l, "en"],
}));

import CounterSignPanel from "./CounterSignPanel";

const pending = {
  id: "22222222-2222-4222-8222-222222222222",
  project_id: "p1",
  user_id: "u1",
  project_name: "Coffee",
  status: "pending",
  counter_signer_name: "",
  counter_signer_signature: "",
  counter_signed_at: null,
  viewed_pdf_at: null,
  created_at: "2026-10-01T10:00:00Z",
};

let hidden = false;

describe("CounterSignPanel polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    list.mockReset();
    list.mockResolvedValue([pending]);
  });
  afterEach(() => vi.useRealTimers());

  it("polls a pending link, pauses while the tab is hidden, and checks again on return", async () => {
    render(<CounterSignPanel projectId="p1" projectName="Coffee" />);
    await act(async () => {});
    expect(list).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Waiting for the other party/)).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(list).toHaveBeenCalledTimes(2);

    hidden = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(list).toHaveBeenCalledTimes(2); // the hidden tick parks without asking

    hidden = false;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("stops polling once the link is signed", async () => {
    list.mockResolvedValue([{ ...pending, status: "signed", counter_signer_name: "Ana" }]);
    render(<CounterSignPanel projectId="p1" projectName="Coffee" />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(list).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Counter-signed")).toBeInTheDocument();
  });

  it("shows the audit trail and offers the signed copy once signed", async () => {
    list.mockResolvedValue([{
      ...pending,
      status: "signed",
      counter_signer_name: "Ana",
      counter_signed_at: "2026-10-04T10:00:00Z",
      viewed_pdf_at: "2026-10-04T09:58:00Z",
      signer_ip: "203.0.113.7",
      audit_id: "33333333-3333-4333-8333-333333333333",
      document_sha256: "a".repeat(64),
    }]);
    render(<MemoryRouter><CounterSignPanel projectId="p1" projectName="Coffee" /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByText("203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText("aaaaaaaa…aaaaaaaa")).toBeInTheDocument();
    expect(screen.getByText("Download the signed copy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Check this agreement/ })).toHaveAttribute("href", "/verify/33333333-3333-4333-8333-333333333333");
  });
});
