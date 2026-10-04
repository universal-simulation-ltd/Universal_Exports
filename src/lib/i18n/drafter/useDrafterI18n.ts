import { useMemo } from "react";
import { useI18n, type MessageKey } from "../index";
import { fill } from "../format";
import { formatAmount, formatCount, formatIsoDate, formatShortDate, isSingular } from "./format";

/** The base of a plural pair: "bank.set" for "bank.set.one" / "bank.set.other". */
type PluralBase = {
  [K in MessageKey]: K extends `${infer B}.one` ? (`${B}.other` extends MessageKey ? B : never) : never;
}[MessageKey];

/**
 * `useI18n()` plus the helpers the drafter screens keep needing:
 *
 *   tf(key, vars)        — the string with `{slots}` filled
 *   tp(base, n, vars)    — the right half of a `.one` / `.other` pair, `{count}` filled
 *   money(n)             — a two-decimal amount in the app's language
 *   date(value)          — a `YYYY-MM-DD` value shown in the app's language
 *   shortDate(value)     — a Date / timestamp shown in the app's language
 */
export function useDrafterI18n() {
  const { t, lang } = useI18n();
  return useMemo(() => {
    const tf = (key: MessageKey, vars: Record<string, string | number>) =>
      fill(t(key), Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])));
    const tp = (base: PluralBase, n: number, vars: Record<string, string | number> = {}) =>
      tf((isSingular(lang, n) ? `${base}.one` : `${base}.other`) as MessageKey, {
        count: formatCount(lang, n),
        ...vars,
      });
    return {
      t,
      lang,
      tf,
      tp,
      money: (n: number) => formatAmount(lang, n),
      date: (value: string) => formatIsoDate(lang, value),
      shortDate: (value: Date | string) => formatShortDate(lang, value),
    };
  }, [t, lang]);
}
