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
const PROKOPF_LINE = "#b8964e";
const REAL_LINE = "#2f6f8f";

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
    // Basis = erstes Datenjahr: alle drei Reihen starten dort bei 100, sodass
    // sich die beiden Effekte (Einwohner, Teuerung) nacheinander ablesen lassen.
    const basis = years[0];
    const proKopf = adjustSeries(ausgaben, ctx, { perCapita: true }, basis);
    const proKopfReal = adjustSeries(ausgaben, ctx, { perCapita: true, real: true }, basis);

    /** Index a series to 100 in the base year; null stays null. */
    const index = (vals: (number | null)[]) => {
      const ref = vals[0];
      if (!ref) return vals.map(() => null);
      return vals.map((v) => (v == null ? null : Math.round((v / ref) * 1000) / 10));
    };

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

    // Chart 2 — one effect peeled off at a time, all indexed to the base year:
    // absolute → per inhabitant (removes population growth) → real (removes
    // inflation on top). Euro levels differ by ~4 orders of magnitude, so an
    // index is the only way to read the three against each other.
    const idxAbs = index(ausgaben.ansatz);
    const idxPk = index(proKopf.ansatz);
    const idxReal = index(proKopfReal.ansatz);
    const euroOf = { abs: ausgaben.ansatz, pk: proKopf.ansatz, real: proKopfReal.ansatz };

    const proKopfOpt: EChartsOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const rows = params as { dataIndex: number; seriesName: string; value: number; color: string }[];
          if (!rows.length) return "";
          const i = rows[0].dataIndex;
          const euro = [euroOf.abs[i], euroOf.pk[i], euroOf.real[i]];
          const body = rows
            .map((r, k) => {
              const e = euro[k];
              const shown = k === 0 ? (e == null ? "—" : fmtEurShort(e)) : e == null ? "—" : fmtEur(Math.round(e));
              return `<div style="display:flex;gap:8px;justify-content:space-between">
                <span><span style="display:inline-block;width:8px;height:8px;background:${r.color};margin-right:6px"></span>${r.seriesName}</span>
                <b>${r.value ?? "—"}</b> <span style="color:#888">${shown}</span></div>`;
            })
            .join("");
          return `<b>${years[i]}</b>${body}`;
        },
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 48, right: 16, top: 16, bottom: 64 },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: {
        type: "value",
        name: `Index ${basis} = 100`,
        nameTextStyle: { color: "#6f6b63", fontSize: 11 },
        axisLabel: { formatter: (v: number) => String(v) },
      },
      series: [
        {
          name: "Ausgaben insgesamt",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: VERMOEGEN },
          itemStyle: { color: VERMOEGEN },
          data: idxAbs,
        },
        {
          name: "je Einwohner",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: PROKOPF_LINE },
          itemStyle: { color: PROKOPF_LINE },
          data: idxPk,
        },
        {
          // All three are Ansatz figures, so none of them is dashed: the dash
          // is reserved app-wide for "Plan, no Ist yet".
          name: "je Einwohner, inflationsbereinigt",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: REAL_LINE },
          itemStyle: { color: REAL_LINE },
          data: idxReal,
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
      basis,
      popGrowth: pop && popFirst ? pop / popFirst - 1 : null,
      proKopfNominal: proKopf.ansatz[i],
      idx: { abs: idxAbs[i], pk: idxPk[i], real: idxReal[i] },
      haushalte,
      proKopfOpt,
      series: { vwh, vmh, ausgaben, proKopf, proKopfReal },
    };
  }, [data, selYear]);

  const movers = useMemo(() => {
    if (!data) return [];
    const y = latestYear(data.budget);
    return topMovers(data, y - 1, y, 4);
  }, [data]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  const pct = (x: number) => `${x > 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;
  /** Index value 128.4 → "+28 %" against the base year. */
  const fromIndex = (v: number | null) => (v == null ? null : v / 100 - 1);

  return (
    <div className="space-y-12">
      <section className="max-w-2xl space-y-4">
        <p className="eyebrow text-ink-muted">Stadt Moosburg an der Isar</p>
        <h1 className="headline text-4xl text-ink">Der Haushalt, öffentlich lesbar</h1>
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
          <h2 className="font-display text-2xl font-bold">Was davon echtes Wachstum ist</h2>
          <span className="text-xs text-ink-muted">{view.basis} = 100</span>
        </div>
        <p className="max-w-2xl text-ink-soft">
          Ein größerer Haushalt heißt nicht automatisch mehr Leistung. Zwei Effekte blähen ihn
          auf, ohne dass eine Straße breiter wird: Moosburg hat <b>mehr Einwohner</b>, und das
          Geld ist <b>weniger wert</b>. Die drei Linien ziehen beide nacheinander ab.
        </p>
        <EChart
          option={view.proKopfOpt}
          ariaLabel={`Ausgabenentwicklung als Index, ${view.basis} gleich 100: insgesamt, je Einwohner und zusätzlich inflationsbereinigt — Zahlen in der Tabelle darunter`}
          style={{ height: 360 }}
        />
        <ol className="max-w-2xl space-y-2 text-sm">
          {[
            [VERMOEGEN, "Ausgaben insgesamt", fromIndex(view.idx.abs),
              "So viel mehr gibt die Stadt nominal aus als " + view.basis + "."],
            [PROKOPF_LINE, "je Einwohner", fromIndex(view.idx.pk),
              `Bevölkerung ${view.popGrowth != null ? pct(view.popGrowth) : "gewachsen"} — pro Kopf bleibt weniger Zuwachs übrig.`],
            [REAL_LINE, "je Einwohner, inflationsbereinigt", fromIndex(view.idx.real),
              "Nach Abzug der Teuerung: der tatsächliche Zuwachs an Leistung."],
          ].map(([color, label, delta, text]) => (
            <li key={label as string} className="flex gap-3">
              <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color as string }} />
              <span>
                <b>{label as string}</b>
                {delta != null && (
                  <span className="ml-2 font-display font-bold tabular-nums">{pct(delta as number)}</span>
                )}
                <span className="block text-ink-muted">{text as string}</span>
              </span>
            </li>
          ))}
        </ol>
        <ChartTable
          summary="Jahreswerte als Tabelle"
          columns={["Jahr", "Ausgaben insgesamt", "je Einwohner", "je Einwohner, real"]}
          rows={view.years.map((y, i) => [
            String(y),
            view.series.ausgaben.ansatz[i] ? fmtEur(view.series.ausgaben.ansatz[i]!) : "—",
            view.series.proKopf.ansatz[i] ? fmtEur(Math.round(view.series.proKopf.ansatz[i]!)) : "—",
            view.series.proKopfReal.ansatz[i] ? fmtEur(Math.round(view.series.proKopfReal.ansatz[i]!)) : "—",
          ])}
        />
        <p className="text-xs text-ink-muted">
          Einwohnerzahlen: Bayerisches Landesamt für Statistik (Zwischenjahre interpoliert).
          Preisentwicklung: Verbraucherpreisindex Deutschland, umbasiert auf {view.basis}.
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
