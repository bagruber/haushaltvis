import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./EChart";
import { ChartTable } from "./ChartTable";
import { adjustSeries, netSeries, type Context, type TimeMode, type YearSeries } from "@/lib/data";
import { fmtEur, fmtEurShort, fmtEurFine } from "@/lib/format";

export interface TimelineMode extends TimeMode {
  showInvest?: boolean;
  /** show Zuschussbedarf (Ausgaben − Einnahmen) instead of gross expenses */
  netto?: boolean;
}

interface Props {
  /** Verwaltungshaushalt (laufender Betrieb) — drawn as lines. */
  laufend: YearSeries;
  /** Vermögenshaushalt (Investitionen) — drawn as bars when mode.showInvest. */
  invest?: YearSeries;
  /** Einnahmen of the same scope — enables the bilanziert (netto) view. */
  einnahmen?: YearSeries;
  mode: TimelineMode;
  context: Context;
  baseYear: number;
  color?: string;
  height?: number;
}

/**
 * Ansatz-vs-Ergebnis timeline. Laufende Kosten (VwHH) as lines; Investitionen
 * (VmHH) — lumpy year to year — as bars, only when explicitly enabled.
 */
export function Timeline({ laufend, invest, einnahmen, mode, context, baseYear, color = "#c8102e", height = 280 }: Props) {
  const { option, table } = useMemo(() => {
    const perKopf = (v: number) => `${fmtEurFine(v)}/Kopf`;
    const fmt = (v: number | null) => (v == null ? "—" : mode.perCapita ? perKopf(v) : fmtEur(v));
    const netto = !!(mode.netto && einnahmen);
    const base = netto ? netSeries(laufend, einnahmen!) : laufend;
    const lf = adjustSeries(base, context, mode, baseYear);
    const iv = invest && mode.showInvest ? adjustSeries(invest, context, mode, baseYear) : null;
    // Keep gross on screen while netted: the distance between the two lines is
    // exactly what fees and charges cover, and that is the point of the view.
    const brutto = netto ? adjustSeries(laufend, context, mode, baseYear) : null;

    const series: NonNullable<EChartsOption["series"]> = [
      { name: netto ? "Zuschussbedarf (Plan)" : "Ansatz (Plan)", type: "line", data: lf.ansatz, symbolSize: 7, lineStyle: { width: 3 }, itemStyle: { color }, connectNulls: true },
      { name: netto ? "Zuschussbedarf (Ist)" : "Ergebnis (Ist)", type: "line", data: lf.ergebnis, symbol: "emptyCircle", symbolSize: 7, lineStyle: { width: 2, type: "dashed", color }, itemStyle: { color }, connectNulls: true },
    ];
    if (brutto) {
      series.push({
        name: "Ausgaben brutto (Plan)",
        type: "line",
        data: brutto.ansatz,
        symbol: "none",
        lineStyle: { width: 1.5, color: "#b0a894" },
        itemStyle: { color: "#b0a894" },
        connectNulls: true,
        z: 1,
      });
    }
    if (iv) {
      series.push({ name: "Investitionen (Ansatz)", type: "bar", data: iv.ansatz, barWidth: "40%", itemStyle: { color: "#b39f7a", opacity: 0.85 } });
    }

    const option: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => fmt(v as number | null) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 16, top: 12, bottom: 44 },
      xAxis: { type: "category", data: laufend.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? fmtEurFine(v) : fmtEurShort(v)) } },
      series,
    };

    const columns = [
      "Jahr",
      netto ? "Zuschussbedarf (Plan)" : "Ansatz (Plan)",
      netto ? "Zuschussbedarf (Ist)" : "Ergebnis (Ist)",
      ...(brutto ? ["Ausgaben brutto (Plan)"] : []),
      ...(iv ? ["Investitionen (Ansatz)"] : []),
    ];
    const rows = lf.years.map((y, i) => [
      `${y}${lf.provisional.has(y) ? " (nur Plan)" : ""}`,
      fmt(lf.ansatz[i]),
      fmt(lf.ergebnis[i]),
      ...(brutto ? [fmt(brutto.ansatz[i])] : []),
      ...(iv ? [fmt(iv.ansatz[i])] : []),
    ]);
    return { option, table: { columns, rows } };
  }, [laufend, invest, einnahmen, mode, context, baseYear, color]);

  return (
    <div>
      <EChart
        option={option}
        ariaLabel="Zeitverlauf von Ansatz (Plan) und Ergebnis (Ist) — Zahlen in der Tabelle darunter"
        style={{ height }}
      />
      <ChartTable columns={table.columns} rows={table.rows} />
    </div>
  );
}

/** Re-usable checkbox row for timeline options. */
export function TimelineControls({
  mode,
  setMode,
  hasContext,
  hasInvest,
  hasEinnahmen,
}: {
  mode: TimelineMode;
  setMode: (fn: (m: TimelineMode) => TimelineMode) => void;
  hasContext: boolean;
  hasInvest: boolean;
  hasEinnahmen?: boolean;
}) {
  if (!hasContext && !hasInvest && !hasEinnahmen) return null;
  return (
    <div className="flex flex-wrap gap-4 text-xs mb-1">
      {hasEinnahmen && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!mode.netto} onChange={(e) => setMode((m) => ({ ...m, netto: e.target.checked }))} />
          <span title="Ausgaben abzüglich eigener Einnahmen wie Gebühren und Entgelte">
            bilanziert (Zuschussbedarf)
          </span>
        </label>
      )}
      {hasInvest && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!mode.showInvest} onChange={(e) => setMode((m) => ({ ...m, showInvest: e.target.checked }))} />
          <span>Investitionen zeigen</span>
        </label>
      )}
      {hasContext && (
        <>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!mode.real} onChange={(e) => setMode((m) => ({ ...m, real: e.target.checked }))} />
            <span>inflationsbereinigt</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!mode.perCapita} onChange={(e) => setMode((m) => ({ ...m, perCapita: e.target.checked }))} />
            <span>je Einwohner</span>
          </label>
        </>
      )}
    </div>
  );
}
