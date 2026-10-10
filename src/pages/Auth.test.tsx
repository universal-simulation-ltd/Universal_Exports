import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const signUp = vi.fn(async () => ({ error: null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signIn: vi.fn(), signUp, resendConfirmation: vi.fn() }),
}));
vi.mock("@unisim/sdk", () => ({
  Chip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useLanguage: () => ({ language: "en-gb" }),
  languageFallbacks: (l: string) => [l, "en"],
}));
vi.mock("@/components/BrandFooter", () => ({ default: () => null }));

import Auth from "./Auth";

describe("Auth — creating a Universal ID", () => {
  beforeEach(() => signUp.mockClear());

  it("doesn't ask for a Companies House number, and signs up without one", async () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /create one free/i }));

    expect(screen.queryByLabelText(/companies house/i)).toBeNull();
    const create = screen.getByRole("button", { name: /create universal id/i });
    expect(create).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret12" } });
    await act(async () => {
      fireEvent.click(create);
    });

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp).toHaveBeenCalledWith("a@b.co", "secret12", { signup_product: "exports" });
  });
});
