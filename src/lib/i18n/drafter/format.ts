// Numbers and dates on the drafter screens, in the app's language (Intl), like
// `formatLongDate` in ../format.ts. Every function falls back to something
// readable if the runtime rejects the language tag.

/** A money amount with two decimals — "1,234.50", "1.234,50", "1 234,50". */
export function formatAmount(lang: string, n: number): string {
  try {
    return new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

/** A whole count — "3", "1,200". */
export function formatCount(lang: string, n: number): string {
  try {
    return new Intl.NumberFormat(lang).format(n);
  } catch {
    return String(n);
  }
}

/** A medium date ("4 Oct 2026", "04.10.2026") from a Date or a timestamp string. */
export function formatShortDate(lang: string, value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(date);
  } catch {
    return date.toDateString();
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A `YYYY-MM-DD` value (what every date input stores) shown in the app's
 * language. Anything else — free text, a partial date — comes back unchanged,
 * so it is safe on any field value.
 */
export function formatIsoDate(lang: string, value: string): string {
  const m = ISO_DATE.exec(value.trim());
  if (!m) return value;
  // Midday UTC, formatted in UTC: the calendar day never shifts by time zone.
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(date);
  } catch {
    return value;
  }
}

/** True when `n` takes the singular form in `lang` (Intl.PluralRules). */
export function isSingular(lang: string, n: number): boolean {
  try {
    return new Intl.PluralRules(lang).select(n) === "one";
  } catch {
    return n === 1;
  }
}
