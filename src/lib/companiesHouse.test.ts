import { describe, it, expect } from "vitest";
import { agreementCompanyNumberStatus, isValidCompanyNumber, normalizeCompanyNumber } from "./companiesHouse";

describe("agreementCompanyNumberStatus — the Export Agreement's CRN gate", () => {
  it("is missing when nothing is entered (a new Universal ID has none)", () => {
    expect(agreementCompanyNumberStatus("")).toBe("missing");
    expect(agreementCompanyNumberStatus("   ")).toBe("missing");
    expect(agreementCompanyNumberStatus(undefined)).toBe("missing");
    expect(agreementCompanyNumberStatus(null)).toBe("missing");
  });

  it("is invalid for something that isn't a Companies House number", () => {
    expect(agreementCompanyNumberStatus("41823004700021")).toBe("invalid"); // a French SIRET
    expect(agreementCompanyNumberStatus("AB-12")).toBe("invalid");
  });

  it("is ok for an English, Scottish or short-form number", () => {
    expect(agreementCompanyNumberStatus("12216301")).toBe("ok");
    expect(agreementCompanyNumberStatus("SC123456")).toBe("ok");
    expect(agreementCompanyNumberStatus("232")).toBe("ok"); // padded to 00000232
  });
});

describe("normalizeCompanyNumber / isValidCompanyNumber", () => {
  it("pads short all-digit numbers and uppercases", () => {
    expect(normalizeCompanyNumber(" sc 123456 ")).toBe("SC123456");
    expect(normalizeCompanyNumber("232")).toBe("00000232");
    expect(isValidCompanyNumber("sc123456")).toBe(true);
    expect(isValidCompanyNumber("SC12345")).toBe(false);
  });
});
