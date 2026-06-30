import { fmtEur } from "./format";

/** Tooltip formatter shared by all Sankey diagrams (edges show the flow, nodes the total). */
export function sankeyTooltip(p: unknown): string {
  const i = p as { dataType: string; name?: string; value?: number; data?: { source?: string; target?: string } };
  if (i.dataType === "edge") return `${i.data?.source} → ${i.data?.target}<br/><b>${fmtEur(i.value!)}</b>`;
  return `<b>${i.name}</b><br/>${fmtEur(i.value!)}`;
}
