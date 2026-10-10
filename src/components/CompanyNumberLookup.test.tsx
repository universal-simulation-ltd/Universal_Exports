import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { emptyDetails, type CompanyDetails } from "@/lib/contactStore";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@unisim/sdk", () => ({
  useLanguage: () => ({ language: "en-gb" }),
  languageFallbacks: (l: string) => [l, "en"],
}));
const lookup = vi.fn();
vi.mock("@/lib/companiesHouse", async (orig) => ({
  ...(await orig<typeof import("@/lib/companiesHouse")>()),
  lookupCompany: (...a: unknown[]) => lookup(...a),
}));

import CompanyNumberLookup from "./CompanyNumberLookup";

let latest: CompanyDetails = emptyDetails();
function Harness({ initial }: { initial: CompanyDetails }) {
  const [d, setD] = useState(initial);
  latest = d;
  return <CompanyNumberLookup details={d} onChange={setD} />;
}

describe("CompanyNumberLookup — your CRN, asked for in Your details", () => {
  beforeEach(() => lookup.mockReset());

  it("explains why it's needed (UK importer or exporter)", () => {
    render(<Harness initial={emptyDetails()} />);
    expect(screen.getByText(/UK importer or exporter/i)).toBeInTheDocument();
  });

  it("looks the number up and fills only the blanks on confirm", async () => {
    lookup.mockResolvedValue({
      ok: true,
      company: {
        company_number: "12216301",
        company_name: "UNI SIM LTD",
        company_status: "active",
        type: "ltd",
        date_of_creation: null,
        registered_office_address: {
          address_line_1: "1 High St", address_line_2: null, locality: "London",
          region: null, postal_code: "N1 1AA", country: null,
        },
      },
    });
    render(<Harness initial={{ ...emptyDetails(), address: "Typed address" }} />);
    fireEvent.change(screen.getByLabelText(/companies house number/i), { target: { value: "12216301" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    });
    expect(screen.getByText("UNI SIM LTD")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /yes, that's us/i }));

    expect(latest.companyNumber).toBe("12216301");
    expect(latest.registeredName).toBe("UNI SIM LTD");
    expect(latest.address).toBe("Typed address"); // never overwritten
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it("refuses to look up something that isn't a Companies House number", async () => {
    render(<Harness initial={emptyDetails()} />);
    fireEvent.change(screen.getByLabelText(/companies house number/i), { target: { value: "41823004700021" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    });
    expect(lookup).not.toHaveBeenCalled();
  });
});
