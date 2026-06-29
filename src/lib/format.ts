import { format } from "d3-format";

const intFmt = format(",d");

/** German integer with thousands separators: 1.234.567 */
export const fmtInt = (v: number) => intFmt(Math.round(v)).replace(/,/g, ".");

/** Euro, no decimals: 1.234.567 € */
export const fmtEur = (v: number) => `${fmtInt(v)} €`;

/** Compact euro for axes/labels: 1,2 Mio. € / 340 Tsd. € */
export function fmtEurShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
  if (abs >= 1_000)
    return `${Math.round(v / 1_000).toLocaleString("de-DE")} Tsd. €`;
  return `${Math.round(v)} €`;
}

export const fmtPct = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(v);

/** Euro for small (per-capita) values: more decimals when the number is tiny. */
export function fmtEurFine(v: number): string {
  const abs = Math.abs(v);
  const d = abs < 10 ? 2 : abs < 100 ? 1 : 0;
  return `${v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;
}
