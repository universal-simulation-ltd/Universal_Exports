import { createElement, Fragment, type ReactNode } from "react";

/** `template` with each `{name}` replaced by `vars.name` (unknown names stay). */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}

/** Like `fill`, but the values can be elements — e.g. a name in <strong>. */
export function fillNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  // split() with a capture group alternates text, name, text, name, …
  const nodes = parts.map((part, i) => (i % 2 === 1 ? (vars[part] ?? `{${part}}`) : part));
  return createElement(Fragment, null, ...nodes);
}

/** A long date ("4 October 2026", "4. Oktober 2026") in the app's language. */
export function formatLongDate(lang: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(date);
  } catch {
    return date.toDateString();
  }
}
