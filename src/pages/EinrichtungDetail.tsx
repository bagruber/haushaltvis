import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  einrichtungInfo,
  einrichtungPosten,
  einrichtungSeries,
  adjustSeries,
  latestYear,
  type TimeMode,
} from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

export function EinrichtungDetail() {
  const { glz = "" } = useParams();
  const { data, error } = useData();
  const [mode, setMode] = useState<TimeMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const info = einrichtungInfo(data, glz);
    if (!info) return { info: null } as const;
    const y = latestYear(data.budget);
    const unit = mode.perCapita ? " €/Kopf" : "";
    const ausgaben = adjustSeries(einrichtungSeries(data, glz, "A"), data.context, mode, y);
    const posten = einrichtungPosten(data, glz);

    // latest Ansatz per Posten for the list
    const latest = new Map<string, number>();
    for (const f of data.budget.facts) {
      if (f.year === y && f.ansatz != null) latest.set(f.hhst_id, f.ansatz);
    }

    const opt: EChartsOption = {
      color: ["#c8102e", "#967a40"],
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : `${fmtEur(v as number)}${unit}`) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 20, top: 16, bottom: 48 },
      xAxis: { type: "category", data: ausgaben.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? `${fmtEur(v)}${unit}` : fmtEurShort(v)) } },
      series: [
        { name: "Ansatz (Plan)", type: "line", data: ausgaben.ansatz, symbolSize: 7, lineStyle: { width: 3 }, connectNulls: true },
        { name: "Ergebnis (Ist)", type: "line", data: ausgaben.ergebnis, symbol: "emptyCircle", symbolSize: 7, lineStyle: { width: 2, type: "dashed" }, connectNulls: true },
      ],
    };

    const hasContext = !!(data.context.cpi || data.context.population);
    return { info, opt, posten, latest, y, hasContext };
  }, [data, glz, mode]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!view.info)
    return (
      <p className="text-ink-muted">
        Unbekannte Einrichtung. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { info, opt, posten, latest, y, hasContext } = view;
  const ausgabenPosten = posten.filter((p) => p.ea === "A");
  const einnahmenPosten = posten.filter((p) => p.ea === "E");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <span>{info.crumb.aufgabenbereich}</span>
        <span>›</span>
        <span className="text-ink-soft">{info.crumb.bereich}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{info.label}</h1>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-md border border-ink-line bg-cream px-2.5 py-1 text-xs text-ink-soft">
            Gliederung {info.glz}
          </span>
          {info.themes.map((t) => (
            <Link key={t.theme} to={`/themen/${t.theme}`}>
              <span className="rounded-md px-2.5 py-1 text-xs text-white" style={{ background: data!.themes.themes[t.theme]?.color ?? "#999" }}>
                {data!.themes.themes[t.theme]?.label ?? t.theme}
              </span>
            </Link>
          ))}
        </div>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Ausgaben über die Jahre</h2>
          <span className="text-xs text-ink-muted">Plan (Ansatz) gegen Ergebnis (Ist). Wert {y} vorläufig.</span>
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

      <section className="grid lg:grid-cols-2 gap-4">
        <PostenList title={`Ausgaben-Posten ${y}`} posten={ausgabenPosten} latest={latest} />
        {einnahmenPosten.length > 0 && (
          <PostenList title={`Einnahme-Posten ${y}`} posten={einnahmenPosten} latest={latest} />
        )}
      </section>
    </div>
  );
}

function PostenList({
  title,
  posten,
  latest,
}: {
  title: string;
  posten: { hhst_id: string; grz_text: string | null; grz: string }[];
  latest: Map<string, number>;
}) {
  const rows = posten
    .map((p) => ({ p, v: latest.get(p.hhst_id) ?? 0 }))
    .sort((a, b) => b.v - a.v);
  return (
    <div className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
      <h2 className="font-display text-lg font-bold mb-2">{title}</h2>
      <ol className="space-y-1.5 text-sm">
        {rows.map(({ p, v }) => (
          <li key={p.hhst_id} className="border-b border-ink-line/60 pb-1.5">
            <Link to={`/posten/${p.hhst_id}`} className="flex justify-between gap-3 hover:text-red-600 transition-colors">
              <span className="text-ink-soft">{p.grz_text ?? p.grz}</span>
              <span className="tabular-nums shrink-0 font-medium">{fmtEur(v)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
