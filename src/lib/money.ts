import type { Lang } from "./types";

const LOCALE: Record<Lang, string> = { uk: "uk-UA", pl: "pl-PL", en: "en-GB" };

/** Prices are stored in minor units (grosze / øre / cents). */
export function money(minor: number, currency: string, lang: Lang = "uk"): string {
  const value = minor / 100;
  return new Intl.NumberFormat(LOCALE[lang] ?? "uk-UA", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** "12,90" or "12.90" → 1290 */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(String(input).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function toMajor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 100).toFixed(2);
}

export function deliveryFor(subtotal: number, fee: number, freeFrom: number | null): number {
  if (freeFrom !== null && subtotal >= freeFrom) return 0;
  return fee;
}
