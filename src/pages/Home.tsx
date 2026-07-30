import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { ChartTable } from "@/components/ChartTable";
import { useData, budgetYearSeries, adjustSeries, latestYear, topMovers } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { Loading } from "@/components/ui";
import { Term } from "@/components/Term";
import { fmtEur, fmtEurShort } from "@/lib/format";

const VERWALTUNG = "#8a7a5c";
const VERMOEGEN = "#c8102e";
const REAL_LINE = "#2f6f8f";

/** Prices are expressed in this year's euros in the real-terms series. */
const PREISBASIS = 2020;

export function Home() {
  usePageTitle();
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const years = data.budget.meta.years;
    const i = years.indexOf(y);

    const vwh = budgetYearSeries(data, "A", "verwaltung");
    const vmh = budgetYearSeries(data, "A", "vermoegen");
    const ausgaben = budgetYearSeries(data, "A");
    const einnahmen = budgetYearSeries(data, "E");

    const ctx = data.context;
    const proKopf = adjustSeries(ausgaben, ctx, { perCapita: true }, PREISBASIS);
    const proKopfReal = adjustSeries(ausgaben, ctx, { perCapita: true, real: true }, PREISBASIS);

    const pop = ctx.population?.[String(y)];
    const popFirst = ctx.population?.[String(years[0])];

    // Chart 1 — the two budgets side by side over time.
    const haushalte: EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => (v ? fmtEur(v as number) : "—"),
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 64, right: 16, top: 16, bottom: 48 },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: [
        {
          name: "Laufender Betrieb (Verwaltungshaushalt)",
          type: "bar",
          stack: "h",
          data: vwh.ansatz,
          itemStyle: { color: VERWALTUNG },
        },
        {
          name: "Investitionen (Vermögenshaushalt)",
          type: "bar",
          stack: "h",
          data: vmh.ansatz,
          itemStyle: { color: VERMOEGEN },
        },
      ],
    };

    // Chart 2 — the same money per inhabitant, nominal against real.
    const proKopfOpt: EChartsOption = {
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => (v ? fmtEur(v as number) : "—"),
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 64, right: 16, top: 16, bottom: 48 },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: [
        {
          name: "je Einwohner (jeweilige Preise)",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: VERMOEGEN },
          itemStyle: { color: VERMOEGEN },
          data: proKopf.ansatz.map((v) => (v == null ? null : Math.round(v))),
        },
        {
          name: `je Einwohner, inflationsbereinigt (Preise ${PREISBASIS})`,
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: REAL_LINE, type: "dashed" },
          itemStyle: { color: REAL_LINE },
          data: proKopfReal.ansatz.map((v) => (v == null ? null : Math.round(v))),
        },
      ],
    };

    return {
      y,
      years,
      ausgaben: ausgaben.ansatz[i] ?? 0,
      einnahmen: einnahmen.ansatz[i] ?? 0,
      investAnteil: (vmh.ansatz[i] ?? 0) / ((vwh.ansatz[i] ?? 0) + (vmh.ansatz[i] ?? 1)),
      pop,
      popGrowth: pop && popFirst ? pop / popFirst - 1 : null,
      proKopfNominal: proKopf.ansatz[i],
      proKopfReal: proKopfReal.ansatz[i],
      proKopfRealFirst: proKopfReal.ansatz[0],
      haushalte,
      proKopfOpt,
      series: { vwh, vmh, proKopf, proKopfReal },
    };
  }, [data, selYear]);

  const movers = useMemo(() => {
    if (!data) return [];
    const y = latestYear(data.budget);
    return topMovers(data, y - 1, y, 4);
  }, [data]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  const realDelta =
    view.proKopfReal && view.proKopfRealFirst ? view.proKopfReal / view.proKopfRealFirst - 1 : null;
  const pct = (x: number) => `${x > 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;

  return (
    <div className="space-y-12">
      <section className="max-w-2xl space-y-4">
        <p className="eyebrow text-ink-muted">Stadt Moosburg an der Isar</p>
        <h1 className="font-display text-4xl font-bold text-ink">Der Haushalt, öffentlich lesbar</h1>
        <p className="text-lg text-ink-soft">
          Jedes Jahr beschließt der Stadtrat, wofür Moosburg Geld ausgibt und woher es kommt.
          Dieser Beschluss ist der <b>Haushalt</b> — {fmtEurShort(view.ausgaben)} im Jahr {view.y}.
          Diese Seite macht ihn durchsuchbar, bis zur einzelnen Buchungszeile.
        </p>
      </section>

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 border-y border-ink-line py-6">
        {[
          ["Ausgaben " + view.y, fmtEurShort(view.ausgaben), "Ansatz, beide Haushalte"],
          ["Einnahmen " + view.y, fmtEurShort(view.einnahmen), "Ansatz, beide Haushalte"],
          [
            "Je Einwohner",
            view.proKopfNominal ? fmtEur(Math.round(view.proKopfNominal)) : "—",
            view.pop ? `${view.pop.toLocaleString("de-DE")} Einwohner` : "",
          ],
          [
            "Davon Investitionen",
            `${Math.round(view.investAnteil * 100)} %`,
            "Rest: laufender Betrieb",
          ],
        ].map(([label, value, hint]) => (
          <div key={label}>
            <div className="eyebrow text-ink-muted">{label}</div>
            <div className="mt-1.5 font-display text-3xl font-bold tabular-nums">{value}</div>
            {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
          </div>
        ))}
      </section>

      <section className="max-w-2xl space-y-3">
        <h2 className="font-display text-2xl font-bold">Zwei Haushalte, zwei Logiken</h2>
        <p className="text-ink-soft">
          Moosburg rechnet <Term name="kameralistik">kameral</Term>. Das heißt: Der Haushalt
          zerfällt in zwei Teile, die getrennt geführt werden. Der{" "}
          <Term name="verwaltungshaushalt">Verwaltungshaushalt</Term> trägt den laufenden Betrieb —
          Gehälter, Strom, Unterhalt, Umlagen. Der{" "}
          <Term name="vermoegenshaushalt">Vermögenshaushalt</Term> finanziert, was länger bleibt:
          Schulhaus, Kanal, Fahrzeuge.
        </p>
        <p className="text-ink-soft">
          Der laufende Betrieb wächst stetig, Investitionen springen — ein Schulbau schlägt in
          zwei, drei Jahren durch und verschwindet dann wieder. Deshalb sagt ein einzelnes Jahr
          wenig; erst die Reihe zeigt etwas.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Der Haushalt über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ausgaben-Ansätze, ohne interne Verrechnungen</span>
        </div>
        <EChart
          option={view.haushalte}
          ariaLabel="Ausgaben je Jahr, aufgeteilt in Verwaltungshaushalt und Vermögenshaushalt — Zahlen in der Tabelle darunter"
          style={{ height: 340 }}
        />
        <ChartTable
          summary="Jahreswerte als Tabelle"
          columns={["Jahr", "Laufender Betrieb", "Investitionen"]}
          rows={view.years.map((y, i) => [
            String(y),
            view.series.vwh.ansatz[i] ? fmtEur(view.series.vwh.ansatz[i]!) : "—",
            view.series.vmh.ansatz[i] ? fmtEur(view.series.vmh.ansatz[i]!) : "—",
          ])}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Was davon Wachstum ist</h2>
          <span className="text-xs text-ink-muted">Ausgaben je Einwohner</span>
        </div>
        <div className="max-w-2xl space-y-3">
          <p className="text-ink-soft">
            Ein größerer Haushalt bedeutet nicht automatisch mehr Leistung. Moosburg ist seit{" "}
            {view.years[0]} um{" "}
            {view.popGrowth != null ? pct(view.popGrowth) : "einige Prozent"} gewachsen, und das
            Geld selbst hat an Wert verloren. Rechnet man beides heraus, bleibt die durchgezogene
            Linie als nominale Entwicklung und die gestrichelte als reale.
          </p>
        </div>
        <EChart
          option={view.proKopfOpt}
          ariaLabel={`Ausgaben je Einwohner, nominal und inflationsbereinigt in Preisen von ${PREISBASIS} — Zahlen in der Tabelle darunter`}
          style={{ height: 340 }}
        />
        <p className="max-w-2xl text-sm text-ink-soft">
          {realDelta != null && (
            <>
              Real, also nach Abzug der Inflation und je Einwohner, liegen die Ausgaben{" "}
              {view.y} um <b>{pct(realDelta)}</b> über dem Stand von {view.years[0]}.{" "}
            </>
          )}
          Der Abstand zwischen beiden Linien ist die Teuerung.
        </p>
        <ChartTable
          summary="Jahreswerte als Tabelle"
          columns={["Jahr", "je Einwohner", `je Einwohner (Preise ${PREISBASIS})`]}
          rows={view.years.map((y, i) => [
            String(y),
            view.series.proKopf.ansatz[i] ? fmtEur(Math.round(view.series.proKopf.ansatz[i]!)) : "—",
            view.series.proKopfReal.ansatz[i] ? fmtEur(Math.round(view.series.proKopfReal.ansatz[i]!)) : "—",
          ])}
        />
        <p className="text-xs text-ink-muted">
          Einwohnerzahlen: Bayerisches Landesamt für Statistik (Zwischenjahre interpoliert).
          Preisentwicklung: Verbraucherpreisindex Deutschland, {PREISBASIS} = 100.
        </p>
      </section>

      {movers.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
            <h2 className="font-display text-2xl font-bold">Das fällt auf</h2>
            <span className="text-xs text-ink-muted">
              Größte Veränderungen {latestYear(data!.budget) - 1} → {latestYear(data!.budget)}
            </span>
          </div>
          <ul>
            {movers.map((m) => {
              const up = m.delta > 0;
              return (
                <li key={m.hhst_id}>
                  <Link
                    to={`/posten/${m.hhst_id}`}
                    className="group flex items-baseline gap-4 border-b border-ink-line py-3 hover:border-ink-soft transition-colors"
                  >
                    <span className="w-24 shrink-0 text-right font-display text-lg font-bold tabular-nums">
                      <span className="sr-only">{up ? "gestiegen um" : "gesunken um"}</span>
                      {up ? "+" : "−"}
                      {fmtEurShort(Math.abs(m.delta))}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-red-600 transition-colors">
                        {m.label}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {m.context} · {fmtEurShort(m.from)} → {fmtEurShort(m.to)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/erkunden"
          className="group border-l-2 border-red-500 pl-5 py-1 hover:border-red-700 transition-colors"
        >
          <span className="block font-display text-xl font-bold group-hover:text-red-600 transition-colors">
            Haushalt erkunden →
          </span>
          <span className="mt-1 block text-sm text-ink-soft">
            Vom Gesamthaushalt bis zur einzelnen Haushaltsstelle: Geldfluss, Einnahmen,
            Investitionen und Querschnitte.
          </span>
        </Link>
        <Link
          to="/themen"
          className="group border-l-2 border-ink-line pl-5 py-1 hover:border-gold-500 transition-colors"
        >
          <span className="block font-display text-xl font-bold group-hover:text-gold-700 transition-colors">
            Themen-Sicht →
          </span>
          <span className="mt-1 block text-sm text-ink-soft">
            Der Haushalt nach Lebensbereichen statt nach Aktenzeichen. In Vorbereitung — die
            Zuordnung ist noch nicht freigegeben.
          </span>
        </Link>
      </section>
    </div>
  );
}
