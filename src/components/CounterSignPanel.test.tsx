import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const list = vi.fn();
vi.mock("@/lib/signatureStore", () => ({
  listSignatureTokens: (...args: unknown[]) => list(...args),
  createSignatureToken: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@unisim/sdk", () => ({ UnisimQr: () => null }));

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
});
