// Small colour helpers for deriving shades of a brand/theme colour.
// `tint` und die Einzelplan-Farben stehen in lib/marke.mjs, weil das
// Kartenskript (scripts/karten.mjs) sie unter Node braucht.
import { EINZELPLAN_COLORS, tint } from "./marke.mjs";

export { EINZELPLAN_COLORS, tint };

/**
 * n shades of a base colour, from slightly darker to noticeably lighter.
 * Used to give one theme colour a readable internal hierarchy.
 */
export function shades(base: string, n: number, from = -0.12, to = 0.5): string[] {
  if (n <= 1) return [base];
  return Array.from({ length: n }, (_, i) => tint(base, from + (to - from) * (i / (n - 1))));
}

export const NEUTRAL_HUB = "#a8a193"; // warm grey for the central node of the main flow
export const GOLD_BASE = "#b8964e";
export const ZUSCHUSS_RED = "#c0392b";
