import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, latestYear } from "@/lib/data";
import type { Aggregator } from "@/lib/data";
import { usePageTitle } from "@/lib/title";
import { Loading } from "@/components/ui";
import { ChartTable } from "@/components/ChartTable";
import { fmtEur, fmtEurShort } from "@/lib/format";

// Fixed display order + colour per aggregator (keys from etl/aggregatoren.yaml).
const ORDER = ["personal", "bauen", "strom", "wasser"] as const;
const COLOR: Record<string, string> = {
  personal: "#2f6f8f",
  bauen: "#c26a2c",
  strom: "#d4a017",
  wasser: "#3a8fb7",
};

/** Members grouped by Gruppierungsart (grz_text) with count + latest final sum. */
function groupsOf(agg: Aggregator, posten: Record<string, { grz_text: string | null }>,
                  factSum: (h: string) => number) {
  const by = new Map<string, { count: number; sum: number }>();
  for (const h of agg.hhst) {
    const t = posten[h]?.grz_text?.replace(/\s+/g, " ").trim() || "(ohne Bezeichnung)";
    const g = by.get(t) ?? { count: 0, sum: 0 };
    g.count += 1;
    g.sum += factSum(h);
    by.set(t, g);
  }
  return [...by.entries()].map(([text, g]) => ({ text, ...g })).sort((a, b) => b.sum - a.sum);
}

export function Querschnitte() {
  usePageTitle("Querschnitte");
  const { data, error } = useData();

  const view = useMemo(() => {
    if (!data) return null;
    const aggs = data.aggregatoren ?? {};
    const keys = ORDER.filter((k) => aggs[k]);
    const years = [...data.budget.meta.years].sort((a, b) => a - b);
    const latest = latestYear(data.budget);

    // latest final (non-provisional) Ergebnis year, shared across aggregators
    const finalYear = Math.max(
      ...years.filter((y) => keys.some((k) => aggs[k].reihe[String(y)] && !aggs[k].reihe[String(y)].prov)),
    );

    // per-hhst value at the latest final year (for the group breakdown)
    const factByHhstYear = new Map<string, number>();
    for (const f of data.budget.facts) {
      if (f.year === finalYear) factByHhstYear.set(f.hhst_id, f.ergebnis ?? f.ansatz ?? 0);
    }
    const factSum = (h: string) => factByHhstYear.get(h) ?? 0;

    const overview: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => (v ? fmtEur(v as number) : "—"), order: "valueDesc" },
      legend: { bottom: 0 },
      grid: { left: 64, right: 16, top: 12, bottom: 44 },
      xAxis: { type: "category", boundaryGap: false, data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: keys.map((k) => ({
        name: aggs[k].title,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        emphasis: { focus: "series" as const },
        lineStyle: { width: 2.5, color: COLOR[k] },
        itemStyle: { color: COLOR[k] },
        data: years.map((y) => aggs[k].reihe[String(y)]?.ansatz ?? null),
      })),
    };

    const cards = keys.map((k) => {
      const a = aggs[k];
      const rL = a.reihe[String(latest)];
      const rF = a.reihe[String(finalYear)];
      return {
        key: k,
        agg: a,
        color: COLOR[k],
        ansatzLatest: rL?.ansatz ?? 0,
        ergebnisFinal: rF?.ergebnis ?? 0,
        groups: groupsOf(a, data.budget.posten, factSum),
      };
    });

    return { keys, years, latest, finalYear, overview, cards, aggs };
  }, [data]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Querschnitte</h1>
        <p className="max-w-2xl text-ink-soft">
          Manche Kosten verteilen sich über den ganzen Haushalt — Personal steckt in fast
          jeder Einrichtung, Strom in jedem Gebäude. Diese <b>Kostenblöcke</b> bündeln solche
          Ausgaben quer zur kameralen Gliederung, damit ihre Entwicklung sichtbar wird.
        </p>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Entwicklung über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ansätze (Plan) je Kostenblock</span>
        </div>
        <EChart
          option={view.overview}
          ariaLabel="Entwicklung der Kostenblöcke Personal, Bauen, Strom und Wasser über die Jahre — Zahlen in der Tabelle darunter"
          style={{ height: 360 }}
        />
        <ChartTable
          summary="Jahreswerte (Ansatz) als Tabelle"
          columns={["Jahr", ...view.keys.map((k) => view.aggs[k].title)]}
          rows={view.years.map((y) => [
            String(y),
            ...view.keys.map((k) => {
              const v = view.aggs[k].reihe[String(y)]?.ansatz;
              return v ? fmtEur(v) : "—";
            }),
          ])}
        />
      </section>

      {view.cards.map((c) => (
        <section key={c.key} className="rounded-xl border border-ink-line bg-white p-4 shadow-soft space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-block h-3 w-3 rounded-sm shrink-0" style={{ background: c.color }} />
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-display text-lg font-bold">{c.agg.title}</h2>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (c.agg.art === "struktur"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800")
                  }
                  title={
                    c.agg.art === "struktur"
                      ? "Exakt aus dem Gruppierungsplan abgeleitet"
                      : "Über Stichworte zusammengestellt — die enthaltenen Posten sind unten nachprüfbar"
                  }
                >
                  {c.agg.art === "struktur" ? "exakt" : "Stichwort-Auswahl"}
                </span>
              </div>
              <p className="text-sm text-ink-soft">{c.agg.beschreibung}</p>
              <p className="text-xs text-ink-muted">Kriterium: {c.agg.kriterium}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-ink-line px-3 py-2">
              <div className="text-xs text-ink-muted">Ansatz {view.latest}</div>
              <div className="font-display text-lg font-bold">{fmtEurShort(c.ansatzLatest)}</div>
            </div>
            <div className="rounded-lg border border-ink-line px-3 py-2">
              <div className="text-xs text-ink-muted">Ergebnis {view.finalYear}</div>
              <div className="font-display text-lg font-bold">{fmtEurShort(c.ergebnisFinal)}</div>
            </div>
            <div className="rounded-lg border border-ink-line px-3 py-2">
              <div className="text-xs text-ink-muted">Haushaltsstellen</div>
              <div className="font-display text-lg font-bold">{c.agg.hhst.length}</div>
            </div>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-ink-soft hover:text-ink w-fit">
              Enthaltene Kostenarten &amp; Posten ({c.agg.hhst.length} Haushaltsstellen)
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-left text-ink-muted border-b border-ink-line">
                  <tr>
                    <th className="py-1.5 font-medium">Kostenart (Gruppierung)</th>
                    <th className="py-1.5 font-medium text-right">Posten</th>
                    <th className="py-1.5 font-medium text-right">{view.finalYear}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.groups.map((g) => (
                    <tr key={g.text} className="border-b border-ink-line/50">
                      <td className="py-1.5">{g.text}</td>
                      <td className="py-1.5 text-right tabular-nums">{g.count}</td>
                      <td className="py-1.5 text-right tabular-nums">{g.sum ? fmtEur(g.sum) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-ink-muted mt-2">
                Einzelne Haushaltsstellen lassen sich über{" "}
                <Link to="/erkunden" className="underline hover:text-ink">Erkunden</Link> und die Suche
                im Detail verfolgen.
              </p>
            </div>
          </details>
        </section>
      ))}

      <p className="text-xs text-ink-muted max-w-2xl">
        „Exakt" bedeutet: direkt aus dem kameralen Gruppierungsplan abgeleitet.
        „Stichwort-Auswahl" fasst Posten anhand ihrer Bezeichnung zusammen (Energie- bzw.
        Wasserbezug) — die enthaltenen Kostenarten sind oben aufgeklappt einsehbar. Werte des
        laufenden Jahres sind vorläufig.
      </p>
    </div>
  );
}
