import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, latestYear, adjustSeries } from "@/lib/data";
import type { Aggregator, YearSeries } from "@/lib/data";
import { TimelineControls, type TimelineMode } from "@/components/Timeline";
import { usePageTitle } from "@/lib/title";
import type { Icon } from "@phosphor-icons/react";
import { Buildings, Desktop, Drop, HandCoins, Lightning, Tag, TreeStructure, Users } from "@phosphor-icons/react";
import { KategorieZeile, Kennzahl, Klecks, Loading } from "@/components/ui";
import { ChartTable } from "@/components/ChartTable";
import { fmtEur, fmtEurShort, fmtEurFine } from "@/lib/format";

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
const ICON: Record<string, Icon> = {
  personal: Users,
  zuschuesse: HandCoins,
  gebaeude: Buildings,
  it: Desktop,
  strom: Lightning,
  wasser: Drop,
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
  const [mode, setMode] = useState<TimelineMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const aggs = data.aggregatoren ?? {};
    const keys = ORDER.filter((k) => aggs[k]);
    const years = [...data.budget.meta.years].sort((a, b) => a - b);
    const latest = latestYear(data.budget);
    const ctx = data.context;

    // latest final (non-provisional) Ergebnis year, shared across aggregators
    const finalYear = Math.max(
      ...years.filter((y) => keys.some((k) => aggs[k].reihe[String(y)] && !aggs[k].reihe[String(y)].prov)),
    );

    /** The stored reihe as a YearSeries, so it can go through adjustSeries. */
    const toSeries = (a: Aggregator): YearSeries => ({
      years,
      ansatz: years.map((y) => a.reihe[String(y)]?.ansatz ?? null),
      ergebnis: years.map((y) => a.reihe[String(y)]?.ergebnis || null),
      provisional: new Set(years.filter((y) => a.reihe[String(y)]?.prov)),
    });
    const adjusted = Object.fromEntries(
      keys.map((k) => [k, adjustSeries(toSeries(aggs[k]), ctx, mode, latest)]),
    ) as Record<string, YearSeries>;

    // Single-year amounts in the drilldown follow the same transformation:
    // deflate to the base year's prices, then divide by that year's population.
    const factorFor = (y: number) => {
      let f = 1;
      if (mode.real && ctx.cpi?.[String(y)] && ctx.cpi?.[String(latest)]) {
        f *= ctx.cpi[String(latest)] / ctx.cpi[String(y)];
      }
      if (mode.perCapita && ctx.population?.[String(y)]) f /= ctx.population[String(y)];
      return f;
    };
    const detailFactor = factorFor(finalYear);

    // per-hhst value at the latest final year (for the group breakdown)
    const factByHhstYear = new Map<string, number>();
    for (const f of data.budget.facts) {
      if (f.year === finalYear) factByHhstYear.set(f.hhst_id, f.ergebnis ?? f.ansatz ?? 0);
    }
    const factSum = (h: string) => (factByHhstYear.get(h) ?? 0) * detailFactor;

    const fmtV = (v: number | null) => (v == null ? "—" : mode.perCapita ? fmtEurFine(v) : fmtEur(v));
    const fmtAxis = (v: number) => (mode.perCapita ? fmtEurFine(v) : fmtEurShort(v));

    const overview: EChartsOption = {
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => (v == null ? "—" : mode.perCapita ? `${fmtEurFine(v as number)}/Kopf` : fmtEur(v as number)),
        order: "valueDesc",
      },
      legend: { bottom: 0 },
      grid: { left: 8, right: 16, top: 12, bottom: 44, containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: fmtAxis } },
      series: keys.map((k) => ({
        name: aggs[k].title,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        emphasis: { focus: "series" as const },
        lineStyle: { width: 2.5, color: COLOR[k] },
        itemStyle: { color: COLOR[k] },
        data: adjusted[k].ansatz,
      })),
    };

    const cards = keys.map((k) => {
      const s = adjusted[k];
      return {
        key: k,
        agg: aggs[k],
        color: COLOR[k],
        ansatzLatest: s.ansatz[years.indexOf(latest)],
        ergebnisFinal: s.ergebnis[years.indexOf(finalYear)],
        groups: groupsOf(aggs[k], data.budget.posten, factSum),
      };
    });

    const hasContext = !!(ctx.cpi || ctx.population);
    return { keys, years, latest, finalYear, overview, cards, aggs, adjusted, fmtV, hasContext };
  }, [data, mode]);

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
          <span className="text-xs text-ink-muted">
            Ansätze (Plan) je Kostenblock
            {mode.real && `, in Preisen von ${view.latest}`}
            {mode.perCapita && ", je Einwohner"}
          </span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={view.hasContext} hasInvest={false} />
        <EChart
          option={view.overview}
          ariaLabel="Entwicklung der Kostenblöcke über die Jahre — Zahlen in der Tabelle darunter"
          style={{ height: 360 }}
        />
        <ChartTable
          summary="Jahreswerte (Ansatz) als Tabelle"
          columns={["Jahr", ...view.keys.map((k) => view.aggs[k].title)]}
          rows={view.years.map((y, i) => [
            String(y),
            ...view.keys.map((k) => view.fmtV(view.adjusted[k].ansatz[i])),
          ])}
        />
      </section>

      {view.cards.map((c, i) => (
        <section key={c.key} className="space-y-4 rounded-lg border border-ink-line bg-white p-5">
          <div className="flex items-center gap-3">
            <Klecks farbe={c.color} icon={ICON[c.key] ?? Buildings} variante={i} />
            <KategorieZeile farbe={c.color} icon={c.agg.art === "struktur" ? TreeStructure : Tag}>
              {c.agg.art === "struktur" ? "Gruppierungsplan" : "Stichwort-Auswahl"}
            </KategorieZeile>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold">{c.agg.title}</h2>
            <p className="max-w-2xl text-sm text-ink-soft">{c.agg.beschreibung}</p>
            <p className="text-xs text-ink-muted">Kriterium: {c.agg.kriterium}</p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Kennzahl wert={view.fmtV(c.ansatzLatest)} label={`Ansatz ${view.latest}`} className="text-2xl" />
            <Kennzahl wert={view.fmtV(c.ergebnisFinal)} label={`Ergebnis ${view.finalYear}`} className="text-2xl" />
          </div>

          <div className="flex items-baseline gap-2 border-t border-ink-line pt-3">
            <span className="font-display text-3xl font-semibold lining-nums tabular-nums">
              {c.agg.hhst.length.toLocaleString("de-DE")}
            </span>
            <span className="text-sm text-ink-muted">Haushaltsstellen</span>
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
                      {g.sum ? view.fmtV(g.sum) : "—"}
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
                          <span className="shrink-0 tabular-nums">{view.fmtV(r.sum)}</span>
                        </Link>
                      </li>
                    ))}
                    {g.restCount > 0 && (
                      <li className="flex items-baseline justify-between gap-3 py-1 text-xs text-ink-muted">
                        <span>+ {g.restCount} weitere</span>
                        <span className="tabular-nums">{g.restSum > 0 ? view.fmtV(g.restSum) : "—"}</span>
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
