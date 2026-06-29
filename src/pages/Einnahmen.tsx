import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, incomeByCategory, incomeCategorySeries, totals, latestYear } from "@/lib/data";
import { shades, GOLD_BASE } from "@/lib/colors";
import { fmtEur, fmtEurShort } from "@/lib/format";

const STEUERN: [string, string][] = [
  ["Einkommensteuer-Anteil", "#c8102e"],
  ["Gewerbesteuer", "#b8964e"],
  ["Grundsteuer", "#009ac7"],
  ["Umsatzsteuer-Anteil", "#0a9e4c"],
];

export function Einnahmen() {
  const { data, error } = useData();

  const view = useMemo(() => {
    if (!data) return null;
    const y = latestYear(data.budget);
    const groups = incomeByCategory(data, y);

    const years = data.budget.meta.years;
    const steuerOpt: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : fmtEur(v as number)) },
      legend: { bottom: 0, type: "scroll" },
      grid: { left: 64, right: 16, top: 12, bottom: 56 },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: STEUERN.map(([name, color]) => {
        const s = incomeCategorySeries(data, name);
        return {
          name,
          type: "line" as const,
          data: years.map((_, i) => s.ergebnis[i] ?? s.ansatz[i]),
          symbolSize: 6,
          lineStyle: { width: 2.5 },
          itemStyle: { color },
          connectNulls: true,
        };
      }),
    };

    return { y, groups, colors: shades(GOLD_BASE, groups.length), total: totals(data.budget, y).einnahmen, steuerOpt };
  }, [data]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;

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
          <h2 className="font-display text-lg font-bold">Steuern im Zeitverlauf</h2>
          <span className="text-xs text-ink-muted">Ergebnis (Ist); {view.y} = Ansatz</span>
        </div>
        <EChart option={view.steuerOpt} style={{ height: 300 }} />
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
