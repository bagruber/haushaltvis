import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  themeYearSeries,
  breakdownByAbschnitt,
  topPosten,
  themeHasEinnahmen,
  latestYear,
  type EA,
  type Data,
  type BudgetEvent,
} from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

function gatherEvents(data: Data, themeId: string): BudgetEvent[] {
  const year = latestYear(data.budget);
  const abs = new Set([
    ...breakdownByAbschnitt(data, themeId, "A", year).map((x) => x.key),
    ...breakdownByAbschnitt(data, themeId, "E", year).map((x) => x.key),
  ]);
  return data.events
    .filter(
      (e) =>
        (e.scope === "theme" && e.id === themeId) ||
        (e.scope === "abschnitt" && abs.has(e.id)),
    )
    .sort((a, b) => a.year - b.year);
}

export function ThemeDetail() {
  const { id = "" } = useParams();
  const { data, error } = useData();
  const [ea, setEa] = useState<EA>("A");

  const view = useMemo(() => {
    if (!data) return null;
    const def = data.themes.themes[id];
    if (!def) return { def: null } as const;
    const year = latestYear(data.budget);
    const hasE = themeHasEinnahmen(data, id, year);
    const series = themeYearSeries(data, id, ea);
    const breakdown = breakdownByAbschnitt(data, id, ea, year);
    const top = topPosten(data, id, ea, year);
    const events = gatherEvents(data, id);
    const evColor = "#a50d24";

    const timeline: EChartsOption = {
      color: [def.color, def.color],
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : fmtEur(v as number)) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 24, top: 24, bottom: 56 },
      xAxis: { type: "category", data: series.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: [
        {
          name: "Ansatz (Plan)",
          type: "line",
          data: series.ansatz,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3 },
          connectNulls: true,
          markLine: events.length
            ? {
                symbol: "none",
                lineStyle: { color: evColor, type: "dashed", opacity: 0.6 },
                label: { show: false },
                data: [...new Set(events.map((e) => e.year))].map((y) => ({
                  xAxis: String(y),
                })),
              }
            : undefined,
        },
        {
          name: "Ergebnis (Ist)",
          type: "line",
          data: series.ergebnis,
          symbol: "emptyCircle",
          symbolSize: 7,
          lineStyle: { width: 2, type: "dashed" },
          itemStyle: { color: "#967a40" },
          connectNulls: true,
        },
      ],
    };
    return { def, year, hasE, breakdown, top, events, timeline };
  }, [data, id, ea]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!view.def)
    return (
      <p className="text-ink-muted">
        Unbekanntes Thema. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { def, year, hasE, breakdown, top, events, timeline } = view;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-ink-muted">
        <Link to="/themen" className="hover:text-ink">Themen</Link> ›{" "}
        <span className="text-ink">{def.label}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-block h-5 w-5 rounded" style={{ background: def.color }} />
          <h1 className="font-display text-3xl font-bold">{def.label}</h1>
        </div>
        <p className="max-w-2xl text-ink-soft">{def.description}</p>
      </header>

      {hasE && (
        <div className="inline-flex rounded-lg border border-ink-line bg-white p-0.5 text-sm">
          {(["A", "E"] as EA[]).map((k) => (
            <button
              key={k}
              onClick={() => setEa(k)}
              className={
                "px-4 py-1.5 rounded-md transition-colors " +
                (ea === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")
              }
            >
              {k === "A" ? "Ausgaben" : "Einnahmen"}
            </button>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <h2 className="font-display text-xl font-bold mb-1">
          Entwicklung {ea === "A" ? "der Ausgaben" : "der Einnahmen"}
        </h2>
        <p className="text-xs text-ink-muted mb-2">
          Plan (Ansatz) gegen tatsächliches Ergebnis. Wert {year} vorläufig.
          {events.length > 0 && " Gestrichelte Linien markieren hinterlegte Ereignisse."}
        </p>
        <EChart option={timeline} style={{ height: 380 }} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
          <h2 className="font-display text-xl font-bold mb-3">
            Verteilung {year} ({ea === "A" ? "Ausgaben" : "Einnahmen"})
          </h2>
          <ul className="space-y-2">
            {breakdown.slice(0, 10).map((b) => {
              const max = breakdown[0].value;
              return (
                <li key={b.key} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{b.label}</span>
                    <span className="tabular-nums text-ink-soft shrink-0">{fmtEur(b.value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-cream-dark">
                    <div
                      className="h-1.5 rounded"
                      style={{ width: `${(b.value / max) * 100}%`, background: def.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
          <h2 className="font-display text-xl font-bold mb-1">Größte Einzelposten {year}</h2>
          <p className="text-xs text-ink-muted mb-3">
            Worauf entfällt das Geld konkret in diesem Thema?
          </p>
          <ol className="space-y-1.5 text-sm">
            {top.map((p) => (
              <li key={p.key} className="flex justify-between gap-3 border-b border-ink-line/60 pb-1.5">
                <span className="text-ink-soft">{p.label}</span>
                <span className="tabular-nums shrink-0 font-medium">{fmtEur(p.value)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <h2 className="font-display text-xl font-bold mb-3">Ereignisse</h2>
        {events.length === 0 ? (
          <p className="text-sm text-ink-muted">Noch keine Ereignisse hinterlegt.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display font-bold text-red-600 tabular-nums shrink-0 w-12">
                  {e.year}
                </span>
                <div>
                  <div className="font-medium">
                    {e.title}
                    {(e as { _auto?: boolean })._auto && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-muted">
                        automatisch erkannt
                      </span>
                    )}
                  </div>
                  {e.text && <div className="text-sm text-ink-muted">{e.text}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
