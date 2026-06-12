// Companies House lookup, used by the sign-up gate. The actual CH API needs a
// server-side key, so we go through the opensource-portal Worker's
// /api/companies-house/:number endpoint (CORS-open, works from localhost dev).
// Override the base for local Worker testing via VITE_COMPANY_LOOKUP_BASE.

const LOOKUP_BASE =
  (import.meta.env.VITE_COMPANY_LOOKUP_BASE as string | undefined) ??
  "https://opensource.unisim.co.uk";

export interface CompanyProfile {
  company_number: string;
  company_name: string;
  company_status: string;
  type: string;
  date_of_creation: string | null;
  registered_office_address: {
    address_line_1: string | null;
    address_line_2: string | null;
    locality: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
  };
}

export type CompanyLookupResult =
  | { ok: true; company: CompanyProfile }
  | { ok: false; reason: "not_found" | "invalid_number" | "unavailable" };

/** Uppercase and left-pad all-digit numbers to 8 ("232" → "00000232"). */
export function normalizeCompanyNumber(raw: string): string {
  let n = raw.replace(/\s+/g, "").toUpperCase();
  if (/^\d{1,8}$/.test(n)) n = n.padStart(8, "0");
  return n;
}

export function isValidCompanyNumber(raw: string): boolean {
  return /^[A-Z0-9]{8}$/.test(normalizeCompanyNumber(raw));
}

export async function lookupCompany(raw: string): Promise<CompanyLookupResult> {
  const number = normalizeCompanyNumber(raw);
  if (!/^[A-Z0-9]{8}$/.test(number)) return { ok: false, reason: "invalid_number" };

  try {
    const res = await fetch(`${LOOKUP_BASE}/api/companies-house/${number}`);
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (res.status === 400) return { ok: false, reason: "invalid_number" };
    if (!res.ok) return { ok: false, reason: "unavailable" };
    return { ok: true, company: (await res.json()) as CompanyProfile };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function formatCompanyAddress(c: CompanyProfile): string {
  const a = c.registered_office_address;
  return [a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
}
