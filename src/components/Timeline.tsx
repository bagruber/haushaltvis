import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./EChart";
import { adjustSeries, type Context, type TimeMode, type YearSeries } from "@/lib/data";
import { fmtEur, fmtEurShort, fmtEurFine } from "@/lib/format";

export interface TimelineMode extends TimeMode {
  showInvest?: boolean;
}

interface Props {
  /** Verwaltungshaushalt (laufender Betrieb) — drawn as lines. */
  laufend: YearSeries;
  /** Vermögenshaushalt (Investitionen) — drawn as bars when mode.showInvest. */
  invest?: YearSeries;
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
export function Timeline({ laufend, invest, mode, context, baseYear, color = "#c8102e", height = 280 }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const perKopf = (v: number) => `${fmtEurFine(v)}/Kopf`;
    const fmt = (v: number | null) => (v == null ? "—" : mode.perCapita ? perKopf(v) : fmtEur(v));
    const lf = adjustSeries(laufend, context, mode, baseYear);
    const iv = invest && mode.showInvest ? adjustSeries(invest, context, mode, baseYear) : null;

    const series: NonNullable<EChartsOption["series"]> = [
      { name: "Ansatz (Plan)", type: "line", data: lf.ansatz, symbolSize: 7, lineStyle: { width: 3 }, itemStyle: { color }, connectNulls: true },
      { name: "Ergebnis (Ist)", type: "line", data: lf.ergebnis, symbol: "emptyCircle", symbolSize: 7, lineStyle: { width: 2, type: "dashed", color }, itemStyle: { color }, connectNulls: true },
    ];
    if (iv) {
      series.push({ name: "Investitionen (Ansatz)", type: "bar", data: iv.ansatz, barWidth: "40%", itemStyle: { color: "#b39f7a", opacity: 0.85 } });
    }

    return {
      tooltip: { trigger: "axis", valueFormatter: (v) => fmt(v as number | null) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 16, top: 12, bottom: 44 },
      xAxis: { type: "category", data: laufend.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? fmtEurFine(v) : fmtEurShort(v)) } },
      series,
    };
  }, [laufend, invest, mode, context, baseYear, color]);

  return <EChart option={option} style={{ height }} />;
}

/** Re-usable checkbox row for timeline options. */
export function TimelineControls({
  mode,
  setMode,
  hasContext,
  hasInvest,
}: {
  mode: TimelineMode;
  setMode: (fn: (m: TimelineMode) => TimelineMode) => void;
  hasContext: boolean;
  hasInvest: boolean;
}) {
  if (!hasContext && !hasInvest) return null;
  return (
    <div className="flex flex-wrap gap-4 text-xs mb-1">
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
