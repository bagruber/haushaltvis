import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { ArrowRight, CaretRight, Coins, FlowArrow, SquaresFour } from "@phosphor-icons/react";
import { EChart } from "@/components/EChart";
import { ChartTable } from "@/components/ChartTable";
import { useData, budgetYearSeries, adjustSeries, latestYear, topMovers } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import {
  Kennzahl,
  KategorieZeile,
  Klecks,
  Loading,
  RoseStatus,
  SeitenKopf,
  SeitenTitel,
  SketchGround,
  Stripe,
} from "@/components/ui";
import { Term } from "@/components/Term";
import { einzelplanKategorie } from "@/lib/kategorien";
import { useNummern } from "@/lib/nummern";
import { useBreit } from "@/lib/notiz";
import { fmtEur, fmtEurShort } from "@/lib/format";

const VERWALTUNG = "#8a7a5c";
const VERMOEGEN = "#c8102e";
const PROKOPF_LINE = "#b8964e";
const REAL_LINE = "#2f6f8f";

export function Home() {
  usePageTitle();
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const breit = useBreit();
  const { zeigen } = useNummern();

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

    // Handwritten note on the year with the highest Ansatz, computed, never fixed.
    const summen = years.map((_, k) => (vwh.ansatz[k] ?? 0) + (vmh.ansatz[k] ?? 0));
    const hoechstes = summen.indexOf(Math.max(...summen));

    // Chart 1 — the two budgets side by side over time.
    const haushalte: EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => (v ? fmtEur(v as number) : "-"),
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 8, right: 16, top: breit ? 64 : 16, bottom: 48, containLabel: true },
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
              const shown = k === 0 ? (e == null ? "-" : fmtEurShort(e)) : e == null ? "-" : fmtEur(Math.round(e));
              return `<div style="display:flex;gap:8px;justify-content:space-between">
                <span><span style="display:inline-block;width:8px;height:8px;background:${r.color};margin-right:6px"></span>${r.seriesName}</span>
                <b>${r.value ?? "-"}</b> <span style="color:#888">${shown}</span></div>`;
            })
            .join("");
          return `<b>${years[i]}</b>${body}`;
        },
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 8, right: 16, top: 28, bottom: 64, containLabel: true },
      xAxis: { type: "category", data: years.map(String) },
      yAxis: {
        type: "value",
        name: `Index ${basis} = 100`,
        nameTextStyle: { color: "#6f6b63", fontSize: 11, align: "left" },
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
      notiz: breit ? { text: "höchster Ansatz", x: String(years[hoechstes]), y: summen[hoechstes] } : undefined,
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
  }, [data, selYear, breit]);

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
      <SeitenKopf titel="Der Haushalt, öffentlich lesbar" script="transparent" className="sm:text-5xl">
        <p className="text-lg">
          Jedes Jahr beschließt der Stadtrat, wofür Moosburg Geld ausgibt und woher es kommt:
          den <b>Haushalt</b>, {fmtEurShort(view.ausgaben)} im Jahr {view.y}. Hier ist er durchsuchbar,
          bis zur einzelnen Buchungszeile.
        </p>
      </SeitenKopf>

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 border-y border-ink-line py-6">
        <Kennzahl wert={fmtEurShort(view.ausgaben)} label={`Ausgaben ${view.y}, Ansatz beider Haushalte`} />
        <Kennzahl wert={fmtEurShort(view.einnahmen)} label={`Einnahmen ${view.y}, Ansatz beider Haushalte`} />
        <Kennzahl
          wert={view.proKopfNominal ? fmtEur(Math.round(view.proKopfNominal)) : "-"}
          label={view.pop ? `je Einwohner, bei ${view.pop.toLocaleString("de-DE")} Einwohnern` : "je Einwohner"}
        />
        <Kennzahl
          wert={`${Math.round(view.investAnteil * 100)} %`}
          label={<>davon <Term name="investition">Investitionen</Term>, der Rest ist laufender Betrieb</>}
        />
      </section>

      <section className="max-w-2xl space-y-3">
        <h2 className="font-display text-2xl font-bold">Zwei Haushalte, zwei Logiken</h2>
        <p className="text-ink-soft">
          Moosburg rechnet <Term name="kameralistik">kameral</Term>, in zwei getrennten Teilen: Der{" "}
          <Term name="verwaltungshaushalt">Verwaltungshaushalt</Term> trägt den laufenden Betrieb
          (Gehälter, Strom, Unterhalt, Umlagen), der{" "}
          <Term name="vermoegenshaushalt">Vermögenshaushalt</Term> finanziert, was länger bleibt:
          Schulhaus, Kanal, Fahrzeuge.
        </p>
        <p className="text-ink-soft">
          Der laufende Betrieb wächst stetig, Investitionen schwanken stark. Aussagekräftig ist
          deshalb erst die Reihe über mehrere Jahre.
        </p>
      </section>

      {view.proKopfNominal != null && (
        <section className="relative overflow-hidden rounded-lg bg-flaeche-haushalt text-cream">
          <SketchGround className="-bottom-10 -right-8 h-[380px] w-[440px] bg-cream opacity-[0.14]" />
          <div className="relative max-w-2xl px-6 pt-7 pb-10 sm:px-10 sm:pt-9 sm:pb-12">
            <KategorieZeile icon={Coins} className="text-gold-200">Wofür zahle ich?</KategorieZeile>
            <SeitenTitel as="h2" script="je Einwohner" className="text-3xl" scriptClassName="text-gold-200/55">
              Was Moosburg {view.y} für jeden ausgibt
            </SeitenTitel>
            <p className="mt-4 whitespace-nowrap font-display text-5xl font-semibold text-gold-200 lining-nums tabular-nums">
              {fmtEur(Math.round(view.proKopfNominal))}
            </p>
            {view.pop && (
              <p className="mt-2 max-w-md">
                Die Ausgaben beider Haushalte, geteilt durch {view.pop.toLocaleString("de-DE")} Einwohner.
              </p>
            )}
            <Link
              to="/wofuer-zahle-ich"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cream px-[18px] font-semibold text-ink transition-colors hover:bg-gold-200"
            >
              Aufschlüsseln
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
          <Stripe className="absolute inset-x-0 bottom-0" />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Der Haushalt über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ausgaben-Ansätze, ohne interne Verrechnungen</span>
        </div>
        <EChart
          option={view.haushalte}
          notiz={view.notiz}
          ariaLabel="Ausgaben je Jahr, aufgeteilt in Verwaltungshaushalt und Vermögenshaushalt, Zahlen in der Tabelle darunter"
          style={{ height: breit ? 380 : 340 }}
        />
        <ChartTable
          summary="Jahreswerte als Tabelle"
          columns={["Jahr", "Laufender Betrieb", "Investitionen"]}
          rows={view.years.map((y, i) => [
            String(y),
            view.series.vwh.ansatz[i] ? fmtEur(view.series.vwh.ansatz[i]!) : "-",
            view.series.vmh.ansatz[i] ? fmtEur(view.series.vmh.ansatz[i]!) : "-",
          ])}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Was davon echtes Wachstum ist</h2>
          <span className="text-xs text-ink-muted">{view.basis} = 100</span>
        </div>
        <p className="max-w-2xl text-ink-soft">
          Zwei Effekte vergrößern den Haushalt, ohne dass die Stadt mehr leistet: <b>mehr
          Einwohner</b> und <b>Inflation</b>. Die Linien rechnen beide nacheinander heraus.
        </p>
        <EChart
          option={view.proKopfOpt}
          ariaLabel={`Ausgabenentwicklung als Index, ${view.basis} gleich 100: insgesamt, je Einwohner und zusätzlich inflationsbereinigt, Zahlen in der Tabelle darunter`}
          style={{ height: 360 }}
        />
        <ol className="max-w-2xl space-y-2 text-sm">
          {[
            [VERMOEGEN, "Ausgaben insgesamt", fromIndex(view.idx.abs),
              "So viel mehr gibt die Stadt nominal aus als " + view.basis + "."],
            [PROKOPF_LINE, "je Einwohner", fromIndex(view.idx.pk),
              `Bevölkerung ${view.popGrowth != null ? pct(view.popGrowth) : "gewachsen"}, pro Kopf bleibt weniger Zuwachs.`],
            [REAL_LINE, "je Einwohner, inflationsbereinigt", fromIndex(view.idx.real),
              "Zusätzlich ohne Teuerung."],
          ].map(([color, label, delta, text]) => (
            <li key={label as string} className="flex gap-3">
              <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color as string }} />
              <span>
                <b>{label as string}</b>
                {delta != null && (
                  <span className="ml-2 font-display font-bold lining-nums tabular-nums">{pct(delta as number)}</span>
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
            view.series.ausgaben.ansatz[i] ? fmtEur(view.series.ausgaben.ansatz[i]!) : "-",
            view.series.proKopf.ansatz[i] ? fmtEur(Math.round(view.series.proKopf.ansatz[i]!)) : "-",
            view.series.proKopfReal.ansatz[i] ? fmtEur(Math.round(view.series.proKopfReal.ansatz[i]!)) : "-",
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
              const p = data!.budget.posten[m.hhst_id];
              const kat = einzelplanKategorie(p.einzelplan);
              return (
                <li key={m.hhst_id}>
                  <Link
                    to={`/posten/${m.hhst_id}`}
                    className="group flex items-baseline gap-4 border-b border-ink-line py-3 hover:border-ink-soft transition-colors"
                  >
                    <span className="w-24 shrink-0 text-right font-display text-lg font-bold lining-nums tabular-nums">
                      <span className="sr-only">{up ? "gestiegen um" : "gesunken um"}</span>
                      {up ? "+" : "−"}
                      {fmtEurShort(Math.abs(m.delta))}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-red-600 transition-colors">
                        {m.label}
                      </span>
                      <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                        <KategorieZeile farbe={kat.farbe} icon={kat.icon}>{p.einzelplan_name}</KategorieZeile>
                        <span className="min-w-0 truncate">
                          {zeigen && `${m.hhst_id} · `}
                          {m.context} · {fmtEurShort(m.from)} → {fmtEurShort(m.to)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tiles from sm on; below that register entries without frame. */}
      <section className="grid sm:grid-cols-2 sm:gap-4">
        {[
          {
            to: "/erkunden",
            titel: "Haushalt erkunden",
            satz: "Vom Gesamthaushalt bis zur einzelnen Haushaltsstelle, mit Einnahmen, Investitionen und Querschnitten.",
            klecks: <Klecks farbe="#c8102e" icon={FlowArrow} />,
          },
          {
            to: "/themen",
            titel: "Themen-Sicht",
            satz: "Der Haushalt nach Lebensbereichen statt nach Aktenzeichen.",
            klecks: <Klecks farbe="#b8964e" icon={SquaresFour} variante={1} />,
            status: <RoseStatus className="mt-2">In Vorbereitung</RoseStatus>,
          },
        ].map((k) => (
          <Link
            key={k.to}
            to={k.to}
            className="group grid grid-cols-[46px_1fr_18px] items-center gap-3 border-t border-ink-line py-3 first:border-t-0 sm:grid-cols-1 sm:content-start sm:gap-3 sm:rounded-lg sm:border sm:bg-white sm:p-5 sm:first:border-t sm:hover:border-ink-muted transition-colors"
          >
            {k.klecks}
            <span>
              <span className="block font-display text-xl font-semibold group-hover:text-red-600 transition-colors">
                {k.titel}
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{k.satz}</span>
              {k.status}
            </span>
            <CaretRight size={18} aria-hidden className="text-ink-muted sm:hidden" />
          </Link>
        ))}
      </section>
    </div>
  );
}
