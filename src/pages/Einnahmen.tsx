import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { TimelineControls, type TimelineMode } from "@/components/Timeline";
import { useData, incomeByCategory, incomeCategorySeries, adjustSeries, totals, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { shades, GOLD_BASE } from "@/lib/colors";
import { ChartTable } from "@/components/ChartTable";
import { Loading } from "@/components/ui";
import { fmtEur, fmtEurShort, fmtEurFine } from "@/lib/format";

const STEUERN: [string, string][] = [
  ["Einkommensteuer-Anteil", "#c8102e"],
  ["Gewerbesteuer", "#b8964e"],
  ["Schlüsselzuweisungen & Finanzausgleich", "#6b3e7a"],
  ["Grundsteuer", "#009ac7"],
  ["Umsatzsteuer-Anteil", "#0a9e4c"],
];

export function Einnahmen() {
  usePageTitle("Einnahmen");
  const { data, error } = useData();

  const { year: selYear } = useYearCtx();
  const [mode, setMode] = useState<TimelineMode>({});
  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const groups = incomeByCategory(data, y);

    const years = data.budget.meta.years;
    const fmtY = (v: number) => (mode.perCapita ? fmtEurFine(v) : fmtEurShort(v));
    const steuerSeries = STEUERN.map(([name]) => {
      const s = adjustSeries(incomeCategorySeries(data, name), data.context, mode, y);
      return { name, values: years.map((_, i) => s.ergebnis[i] ?? s.ansatz[i]) };
    });
    const fmtCell = (v: number | null) => (v == null ? "—" : mode.perCapita ? fmtEurFine(v) : fmtEur(v));
    const steuerRows = years.map((yy, i) => [String(yy), ...steuerSeries.map((s) => fmtCell(s.values[i]))]);
    const steuerOpt: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : mode.perCapita ? `${fmtEurFine(v as number)}/Kopf` : fmtEur(v as number)) },
      legend: { bottom: 0, type: "scroll" },
      grid: { left: 66, right: 16, top: 12, bottom: 56 },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: fmtY } },
      series: STEUERN.map(([name, color], si) => ({
        name,
        type: "line" as const,
        data: steuerSeries[si].values,
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        itemStyle: { color },
        connectNulls: true,
      })),
    };

    const hasContext = !!(data.context.cpi || data.context.population);
    return { y, groups, colors: shades(GOLD_BASE, groups.length), total: totals(data.budget, y).einnahmen, steuerOpt, steuerRows, hasContext };
  }, [data, selYear, mode]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Woher das Geld kommt</h1>
        <p className="max-w-2xl text-ink-soft">
          Die Einnahmen der Stadt nach Art geordnet — Steuern, Zuweisungen, Gebühren und mehr.
          Interne Verrechnungen sind ausgeblendet.
        </p>
        <span className="inline-block rounded-md bg-white border border-ink-line px-3 py-1.5 text-sm">
          Einnahmen {view.y}: <b>{fmtEurShort(view.total)}</b>
        </span>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Steuern & Zuweisungen im Zeitverlauf</h2>
          <span className="text-xs text-ink-muted">Ergebnis (Ist); {view.y} = Ansatz</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={view.hasContext} hasInvest={false} />
        <EChart option={view.steuerOpt} ariaLabel="Zeitverlauf der wichtigsten Steuern und Zuweisungen — Zahlen in der Tabelle darunter" style={{ height: 300 }} />
        <ChartTable columns={["Jahr", ...STEUERN.map(([n]) => n)]} rows={view.steuerRows} />
      </section>

      <div className="space-y-4">
        {view.groups.map((g, i) => (
          <section key={g.key} className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
            <div className="flex items-baseline justify-between gap-3 mb-2 border-b border-ink-line pb-1.5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: view.colors[i] }} />
                {g.label}
              </h2>
              <span className="tabular-nums text-ink-soft">{fmtEur(g.value)}</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {g.posten.slice(0, 8).map((p) => (
                <li key={p.key} className="border-b border-ink-line/50 pb-1.5 last:border-0">
                  <Link to={`/posten/${p.key}`} className="flex items-center justify-between gap-3 hover:text-red-600 transition-colors">
                    <span className="truncate">{p.label}</span>
                    <span className="tabular-nums shrink-0 font-medium">{fmtEur(p.value)}</span>
                  </Link>
                </li>
              ))}
              {g.posten.length > 8 && (
                <li className="text-xs text-ink-muted pt-0.5">+ {g.posten.length - 8} weitere Posten</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
