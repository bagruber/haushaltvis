import { fmtEur, fmtPct } from "./format";

function sankeyText(p: unknown, gesamt?: number): string {
  const i = p as { dataType: string; name?: string; value?: number; data?: { source?: string; target?: string } };
  const anteil = gesamt ? ` · ${fmtPct(i.value! / gesamt)}` : "";
  if (i.dataType === "edge") return `${i.data?.source} → ${i.data?.target}<br/><b>${fmtEur(i.value!)}</b>${anteil}`;
  return `<b>${i.name}</b><br/>${fmtEur(i.value!)}${anteil}`;
}

/** Tooltip formatter shared by all Sankey diagrams (edges show the flow, nodes the total). */
export function sankeyTooltip(p: unknown): string {
  return sankeyText(p);
}

/** Same, plus each amount as a share of the whole budget: millions read better as a share. */
export const sankeyTooltipMitAnteil = (gesamt: number) => (p: unknown) => sankeyText(p, gesamt);
