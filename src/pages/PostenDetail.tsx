import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  postenSeries,
  postenCrumb,
  adjustSeries,
  eventsFor,
  type TimeMode,
} from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-ink-line bg-cream px-2.5 py-1 text-xs text-ink-soft">
      {children}
    </span>
  );
}

export function PostenDetail() {
  const { id = "" } = useParams();
  const { data, error } = useData();
  const [mode, setMode] = useState<TimeMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const p = data.budget.posten[id];
    if (!p) return { p: null } as const;
    const baseYear = Math.max(...data.budget.meta.years);
    const unit = mode.perCapita ? " €/Kopf" : "";
    const series = adjustSeries(postenSeries(data, id), data.context, mode, baseYear);
    const crumb = postenCrumb(data, p);
    const tags = data.themes.assignment[id] ?? [];
    const events = eventsFor(data, "hhst", id);
    const hasContext = !!(data.context.cpi || data.context.population);

    const opt: EChartsOption = {
      color: ["#c8102e", "#967a40"],
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : `${fmtEur(v as number)}${unit}`) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 20, top: 16, bottom: 48 },
      xAxis: { type: "category", data: series.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? `${fmtEur(v)}${unit}` : fmtEurShort(v)) } },
      series: [
        { name: "Ansatz (Plan)", type: "line", data: series.ansatz, symbolSize: 7, lineStyle: { width: 3 }, connectNulls: true },
        { name: "Ergebnis (Ist)", type: "line", data: series.ergebnis, symbol: "emptyCircle", symbolSize: 7, lineStyle: { width: 2, type: "dashed" }, connectNulls: true },
      ],
    };
    return { p, opt, crumb, tags, events, hasContext, baseYear };
  }, [data, id, mode]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!view.p)
    return (
      <p className="text-ink-muted">
        Unbekannter Posten. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { p, opt, crumb, tags, events, hasContext, baseYear } = view;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <Link to={`/einzelplan/${p.einzelplan}`} className="hover:text-ink underline-offset-2 hover:underline">{crumb.aufgabenbereich}</Link>
        <span>›</span>
        <span>{crumb.bereich}</span>
        <span>›</span>
        <Link to={`/einrichtung/${p.glz}`} className="text-ink-soft hover:text-ink underline-offset-2 hover:underline">{crumb.einrichtung}</Link>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{p.grz_text}</h1>
        {p.kontotext && <p className="text-ink-soft">{p.kontotext}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>{p.ea === "E" ? "Einnahme" : "Ausgabe"}</Chip>
          <Chip>{p.haushalt === "verwaltung" ? "Verwaltungshaushalt" : "Vermögenshaushalt"}</Chip>
          <Chip>Haushaltsstelle {p.glz}.{p.grz}</Chip>
          {tags.map((t) => (
            <Link key={t.theme} to={`/themen/${t.theme}`}>
              <span
                className="rounded-md px-2.5 py-1 text-xs text-white"
                style={{ background: data!.themes.themes[t.theme]?.color ?? "#999" }}
              >
                {data!.themes.themes[t.theme]?.label ?? t.theme}
              </span>
            </Link>
          ))}
        </div>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Entwicklung über die Jahre</h2>
          <span className="text-xs text-ink-muted">Plan (Ansatz) gegen Ergebnis (Ist). Wert {baseYear} vorläufig.</span>
        </div>
        {hasContext && (
          <div className="flex flex-wrap gap-4 text-xs mb-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!mode.real} onChange={(e) => setMode((m) => ({ ...m, real: e.target.checked }))} />
              <span>inflationsbereinigt</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!mode.perCapita} onChange={(e) => setMode((m) => ({ ...m, perCapita: e.target.checked }))} />
              <span>je Einwohner</span>
            </label>
          </div>
        )}
        <EChart option={opt} style={{ height: 320 }} />
      </section>

      {events.length > 0 && (
        <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
          <h2 className="font-display text-lg font-bold mb-2">Ereignisse</h2>
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-semibold tabular-nums text-red-600 shrink-0">{e.year}</span>
                <span>
                  <b>{e.title}</b>
                  {e.text && <span className="text-ink-soft"> — {e.text}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
