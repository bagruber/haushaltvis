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
const ORDER = ["personal", "zuschuesse", "gebaeude", "it", "strom", "wasser"] as const;
const COLOR: Record<string, string> = {
  personal: "#2f6f8f",
  zuschuesse: "#6b3e7a",
  gebaeude: "#c26a2c",
  it: "#0a9e4c",
  strom: "#d4a017",
  wasser: "#3a8fb7",
};

/** How many single Posten to name inside each Gruppierung before summarising. */
const POSTEN_JE_GRUPPE = 6;

interface PostenRow {
  hhst: string;
  label: string;
  sum: number;
}

/**
 * Members grouped by Gruppierungsart (grz_text). Within a group every Posten
 * carries the same Gruppierungstext, so the telling label is the Einrichtung
 * (glz_text) — that is what makes a Zuschuss traceable to a recipient.
 */
function groupsOf(
  agg: Aggregator,
  posten: Record<string, { grz_text: string | null; glz_text: string | null; kontotext: string | null }>,
  factSum: (h: string) => number,
) {
  const clean = (s: string | null | undefined) => s?.replace(/\s+/g, " ").trim() || "";
  const by = new Map<string, { count: number; sum: number; rows: PostenRow[] }>();
  for (const h of agg.hhst) {
    const p = posten[h];
    const t = clean(p?.grz_text) || "(ohne Bezeichnung)";
    const g = by.get(t) ?? { count: 0, sum: 0, rows: [] };
    const sum = factSum(h);
    g.count += 1;
    g.sum += sum;
    g.rows.push({ hhst: h, label: clean(p?.kontotext) || clean(p?.glz_text) || h, sum });
    by.set(t, g);
  }
  return [...by.entries()]
    .map(([text, g]) => {
      const rows = g.rows.sort((a, b) => b.sum - a.sum);
      const top = rows.slice(0, POSTEN_JE_GRUPPE).filter((r) => r.sum > 0);
      return {
        text,
        count: g.count,
        sum: g.sum,
        top,
        restCount: g.count - top.length,
        restSum: g.sum - top.reduce((s, r) => s + r.sum, 0),
      };
    })
    .sort((a, b) => b.sum - a.sum);
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
        <h1 className="headline text-3xl">Querschnitte</h1>
        <p className="max-w-2xl text-ink-soft">
          Manche Kosten verteilen sich über den ganzen Haushalt — Personal steckt in fast
          jeder Einrichtung, Strom in jedem Gebäude. Diese <b>Kostenblöcke</b> bündeln solche
          Ausgaben quer zur kameralen Gliederung, damit ihre Entwicklung sichtbar wird.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-xl font-bold">Entwicklung über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ansätze (Plan) je Kostenblock</span>
        </div>
        <EChart
          option={view.overview}
          ariaLabel="Entwicklung der Kostenblöcke über die Jahre — Zahlen in der Tabelle darunter"
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
        <section key={c.key} className="space-y-3 border-t-2 pt-4" style={{ borderColor: c.color }}>
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-xl font-bold">{c.agg.title}</h2>
              <span className="eyebrow text-ink-muted">
                {c.agg.art === "struktur" ? "Gruppierungsplan" : "Stichwort-Auswahl"}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-ink-soft">{c.agg.beschreibung}</p>
            <p className="text-xs text-ink-muted">Kriterium: {c.agg.kriterium}</p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {[
              [`Ansatz ${view.latest}`, fmtEurShort(c.ansatzLatest)],
              [`Ergebnis ${view.finalYear}`, fmtEurShort(c.ergebnisFinal)],
              ["Haushaltsstellen", String(c.agg.hhst.length)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="eyebrow text-ink-muted">{label}</div>
                <div className="font-display text-xl font-bold tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-ink-soft hover:text-ink w-fit">
              Enthaltene Kostenarten &amp; Posten ({c.agg.hhst.length} Haushaltsstellen)
            </summary>
            <div className="mt-3 space-y-4">
              {c.groups.map((g) => (
                <div key={g.text}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-ink-line pb-1">
                    <span className="font-medium">{g.text}</span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      {g.sum ? fmtEur(g.sum) : "—"}
                      <span className="ml-2 text-xs text-ink-muted">
                        {g.count} {g.count === 1 ? "Posten" : "Posten"}
                      </span>
                    </span>
                  </div>
                  <ul className="text-sm">
                    {g.top.map((r) => (
                      <li key={r.hhst}>
                        <Link
                          to={`/posten/${r.hhst}`}
                          className="flex items-baseline justify-between gap-3 border-b border-ink-line/40 py-1 hover:text-red-600 transition-colors"
                        >
                          <span className="min-w-0 truncate text-ink-soft">{r.label}</span>
                          <span className="shrink-0 tabular-nums">{fmtEur(r.sum)}</span>
                        </Link>
                      </li>
                    ))}
                    {g.restCount > 0 && (
                      <li className="flex items-baseline justify-between gap-3 py-1 text-xs text-ink-muted">
                        <span>+ {g.restCount} weitere</span>
                        <span className="tabular-nums">{g.restSum > 0 ? fmtEur(g.restSum) : "—"}</span>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-ink-muted">
                Beträge sind das Ergebnis {view.finalYear}. Ein Klick öffnet die Haushaltsstelle mit
                ihrem Zeitverlauf.
              </p>
            </div>
          </details>
        </section>
      ))}

      <p className="text-xs text-ink-muted max-w-2xl">
        „Gruppierungsplan" heißt: exakt aus der kameralen Systematik abgeleitet.
        „Stichwort-Auswahl" fasst Posten anhand ihrer Bezeichnung zusammen — die enthaltenen
        Kostenarten sind oben aufklappbar. Für das laufende Jahr steht nur der Plan; das
        Ergebnis stammt daher aus {view.finalYear}.
      </p>
    </div>
  );
}
