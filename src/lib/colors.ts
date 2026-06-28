// Small colour helpers for deriving shades of a brand/theme colour.

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number];
}
function rgbToHex(rgb: number[]): string {
  return "#" + rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}
function mix(hex: string, target: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

/** Lighten (t>0, toward white) or darken (t<0, toward black) a hex colour. */
export function tint(hex: string, t: number): string {
  return t < 0 ? mix(hex, "#000000", -t) : mix(hex, "#ffffff", t);
}

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
