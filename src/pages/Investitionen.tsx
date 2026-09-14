import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  investmentProjects,
  investmentStacked,
  latestYear,
  FUNDING_LABEL,
  FUNDING_COLOR,
  type FundingKind,
  type InvestProject,
} from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { Kennzahl, Loading } from "@/components/ui";
import { Term } from "@/components/Term";
import { Nummer, doppelte, useNummern } from "@/lib/nummern";
import { ChartTable } from "@/components/ChartTable";
import { fmtEur, fmtEurShort } from "@/lib/format";

const KINDS: FundingKind[] = ["foerderung", "beitraege", "verkauf"];
const EIGEN_COLOR = "#c8102e";
const TOP_JAHR = 14;

const sumFunding = (f: Record<FundingKind, number>) =>
  KINDS.reduce((s, k) => s + f[k], 0) + f.sonstige;

/**
 * How a given cost is covered, capped at the cost itself. Baugebiete can earn
 * more than they cost (land sales); the surplus is reported in words rather
 * than drawn as a negative stack, which would only garble the bar.
 */
function coverage(cost: number, funding: Record<FundingKind, number>) {
  const total = sumFunding(funding);
  const scale = total > cost && total > 0 ? cost / total : 1;
  const parts = Object.fromEntries(
    KINDS.map((k) => [k, funding[k] * scale]),
  ) as Record<FundingKind, number>;
  parts.sonstige = funding.sonstige * scale;
  return { parts, eigen: Math.max(0, cost - total), ueberschuss: Math.max(0, total - cost) };
}

/** "2018–2024", "seit spätestens 2016", "läuft weiter", "Daueransatz". */
function spanLabel(p: InvestProject): string {
  if (p.daueransatz) return "laufender Ansatz";
  if (p.first === p.last) return String(p.first);
  const from = p.offenAnfang ? `vor ${p.first}` : String(p.first);
  const to = p.offenEnde ? "offen" : String(p.last);
  return `${from}–${to}`;
}

export function Investitionen() {
  usePageTitle("Investitionen");
  const { data, error } = useData();
  const navigate = useNavigate();
  const { zeigen } = useNummern();
  const { year: selYear } = useYearCtx();

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const projects = investmentProjects(data, y);

    const imJahr = projects.filter((p) => p.imJahr > 0).sort((a, b) => b.imJahr - a.imJahr);
    const top = imJahr.slice(0, TOP_JAHR);
    const cov = top.map((p) => coverage(p.imJahr, p.fundingImJahr));

    // Current year, stacked by how each project is paid for.
    const jahrOpt: EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => (v ? fmtEur(v as number) : "—"),
      },
      legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
      grid: { left: 8, right: 24, top: 8, bottom: 56, containLabel: true },
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      yAxis: {
        type: "category",
        inverse: true,
        data: top.map((p) => p.label),
        axisLabel: { width: 190, overflow: "truncate", fontSize: 11 },
      },
      series: [
        ...KINDS.map((k) => ({
          name: FUNDING_LABEL[k],
          type: "bar" as const,
          stack: "x",
          data: cov.map((c) => Math.round(c.parts[k])),
          itemStyle: { color: FUNDING_COLOR[k] },
        })),
        {
          name: "Eigenanteil der Stadt",
          type: "bar" as const,
          stack: "x",
          data: cov.map((c) => Math.round(c.eigen)),
          itemStyle: { color: EIGEN_COLOR },
        },
      ],
    };

    // Summed per project, not on the aggregate: a Baugebiet that earns more
    // than it costs cannot pay for a school, so its surplus must not shrink the
    // city's own share elsewhere.
    const covJahr = imJahr.reduce(
      (acc, p) => {
        const c = coverage(p.imJahr, p.fundingImJahr);
        for (const k of [...KINDS, "sonstige" as const]) acc.parts[k] += c.parts[k];
        acc.eigen += c.eigen;
        return acc;
      },
      { parts: { foerderung: 0, beitraege: 0, verkauf: 0, sonstige: 0 } as Record<FundingKind, number>, eigen: 0 },
    );
    const totalJahr = imJahr.reduce((s, p) => s + p.imJahr, 0);

    const stacked = investmentStacked(data, 12);
    const stackedOpt: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => (v ? fmtEur(v as number) : "—"), order: "valueDesc" },
      legend: { type: "scroll", bottom: 0 },
      grid: { left: 8, right: 16, top: 12, bottom: 56, containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: stacked.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      series: stacked.series.map((s) => ({
        name: s.name,
        type: "line" as const,
        stack: "inv",
        areaStyle: { color: s.color, opacity: 0.85 },
        lineStyle: { width: 0 },
        showSymbol: false,
        itemStyle: { color: s.color },
        emphasis: { focus: "series" as const },
        data: s.data,
      })),
    };
    const stackedTotals = stacked.years.map((_, i) => stacked.series.reduce((s, x) => s + (x.data[i] ?? 0), 0));

    const vorhaben = projects.filter((p) => !p.daueransatz).slice(0, 20);
    const dauer = projects.filter((p) => p.daueransatz);

    return {
      y, projects, imJahr, top, cov, jahrOpt, totalJahr, covJahr, stackedOpt, stackedYears: stacked.years, stackedTotals, vorhaben, dauer,
      dupVorhaben: doppelte(vorhaben.map((p) => p.label)),
      dupDauer: doppelte(dauer.map((p) => p.label)),
    };
  }, [data, selYear]);

  const onEvents = useMemo(
    () => ({
      click: (p: unknown) => {
        const i = p as { name?: string };
        const hit = view?.top.find((x) => x.label === i.name);
        if (hit) navigate(`/einrichtung/${hit.glz}`);
      },
    }),
    [view, navigate],
  );

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  const { y, covJahr, totalJahr } = view;
  const gegenfinanziert = totalJahr - covJahr.eigen;

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="headline text-3xl">Investitionen</h1>
        {/* Round 1: the word "Investitionen" itself was unclear, so the page opens with what it means. */}
        <p className="text-lg">
          <Term name="investition">Investitionen</Term> sind Ausgaben für Dinge, die viele Jahre bleiben:
          Schulhäuser, Straßen, Grundstücke, Fahrzeuge.
        </p>
        <p className="text-ink-soft">
          Sie stehen im <Term name="vermoegenshaushalt">Vermögenshaushalt</Term>. Ein Vorhaben läuft meist
          über mehrere Jahre — hier steht es als Ganzes, mit seiner Laufzeit und dem, was am Ende
          die Stadt selbst trägt.
        </p>
      </header>

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 border-y border-ink-line py-6">
        {[
          [`Investitionen ${y}`, fmtEurShort(totalJahr), `${view.imJahr.length} Vorhaben`],
          ["Gegenfinanziert", fmtEurShort(gegenfinanziert), `${Math.round((gegenfinanziert / (totalJahr || 1)) * 100)} % der Kosten`],
          ["Eigenanteil der Stadt", fmtEurShort(covJahr.eigen), "aus Steuern und Krediten"],
          ["Davon Förderung", fmtEurShort(covJahr.parts.foerderung), "Zuweisungen und Zuschüsse"],
        ].map(([label, value, hint]) => (
          <Kennzahl key={label} wert={value} label={`${label}, ${hint}`} className="text-2xl" />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Wer {y} bezahlt</h2>
          <span className="text-xs text-ink-muted">Klick öffnet die Einrichtung</span>
        </div>
        <p className="max-w-2xl text-ink-soft">
          Jeder Balken ist ein Vorhaben im laufenden Jahr, aufgeteilt nach Herkunft des Geldes.
          Getrennt ausgewiesen, weil es etwas anderes ist: <b>Förderung</b> kommt von Bund und
          Land, <b>Anliegerbeiträge</b> von Grundstückseigentümern, <b>Verkaufserlöse</b> aus
          veräußerten Grundstücken. Nur der rote Teil stammt aus Steuern und Krediten.
        </p>
        <EChart
          option={view.jahrOpt}
          onEvents={onEvents}
          ariaLabel={`Investitionsvorhaben ${y}, aufgeteilt nach Finanzierungsquelle — Zahlen in der Tabelle darunter`}
          style={{ height: TOP_JAHR * 32 + 80 }}
        />
        <ChartTable
          summary="Vorhaben des Jahres als Tabelle"
          columns={["Vorhaben", "Kosten", "Förderung", "Beiträge", "Verkauf", "Eigenanteil"]}
          rows={view.top.map((p, i) => [
            p.label,
            fmtEur(p.imJahr),
            fmtEur(Math.round(view.cov[i].parts.foerderung)),
            fmtEur(Math.round(view.cov[i].parts.beitraege)),
            fmtEur(Math.round(view.cov[i].parts.verkauf)),
            fmtEur(Math.round(view.cov[i].eigen)),
          ])}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Vorhaben über ihre ganze Laufzeit</h2>
          <span className="text-xs text-ink-muted">Summe aller Jahre, größte zuerst</span>
        </div>
        <p className="max-w-2xl text-ink-soft">
          Die Laufzeit ist aus den Daten abgeleitet: Ein Vorhaben existiert in den Jahren, in
          denen es einen Ansatz trägt. Weil die Datenreihe {view.stackedYears[0]} beginnt und{" "}
          {view.stackedYears[view.stackedYears.length - 1]} endet, sind Vorhaben an diesen Rändern
          als offen gekennzeichnet — sie liefen schon vorher oder laufen weiter.
        </p>
        <ul>
          {view.vorhaben.map((p) => {
            const c = coverage(p.total, p.funding);
            return (
              <li key={p.glz}>
                <Link
                  to={`/einrichtung/${p.glz}`}
                  className="group block border-b border-ink-line py-3 hover:border-ink-soft transition-colors"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="flex items-baseline font-medium group-hover:text-red-600 transition-colors">
                      <Nummer wert={p.glz} sichtbar={zeigen || view.dupVorhaben.has(p.label)} />
                      {p.label}
                    </span>
                    <span className="font-display font-bold tabular-nums">{fmtEur(p.total)}</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-sm bg-cream-dark">
                    {KINDS.map((k) =>
                      c.parts[k] > 0 ? (
                        <span key={k} style={{ width: `${(c.parts[k] / p.total) * 100}%`, background: FUNDING_COLOR[k] }} />
                      ) : null,
                    )}
                    {c.eigen > 0 && <span style={{ width: `${(c.eigen / p.total) * 100}%`, background: EIGEN_COLOR }} />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-muted">
                    <span>{spanLabel(p)}</span>
                    <span>{p.years.length} {p.years.length === 1 ? "Jahr" : "Jahre"} mit Ansatz</span>
                    {c.eigen > 0 && <span>Eigenanteil {fmtEur(Math.round(c.eigen))}</span>}
                    {c.ueberschuss > 0 && (
                      <span className="text-ink-soft">
                        trägt sich selbst — Einnahmen übersteigen die Kosten um{" "}
                        {fmtEur(Math.round(c.ueberschuss))}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {view.dauer.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
            <h2 className="font-display text-2xl font-bold">Laufende Ansätze</h2>
            <span className="text-xs text-ink-muted">kein einzelnes Vorhaben</span>
          </div>
          <p className="max-w-2xl text-ink-soft">
            Diese Positionen tragen in fast jedem Jahr einen Ansatz — Grunderwerb,
            Straßenunterhalt, Fahrzeugbeschaffung. Sie sind Daueraufgaben, keine Projekte mit
            Anfang und Ende.
          </p>
          <ul>
            {view.dauer.map((p) => (
              <li key={p.glz}>
                <Link
                  to={`/einrichtung/${p.glz}`}
                  className="group flex flex-wrap items-baseline justify-between gap-x-4 border-b border-ink-line py-2.5 hover:border-ink-soft transition-colors"
                >
                  <span className="flex items-baseline group-hover:text-red-600 transition-colors">
                    <Nummer wert={p.glz} sichtbar={zeigen || view.dupDauer.has(p.label)} />
                    {p.label}
                  </span>
                  <span className="tabular-nums text-ink-soft">
                    {fmtEur(p.total)} <span className="text-xs text-ink-muted">seit {p.first}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-2xl font-bold">Investitionen über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ansätze, gestapelt nach Einzelplan</span>
        </div>
        <EChart
          option={view.stackedOpt}
          ariaLabel="Investitionen über die Jahre, gestapelt nach Einzelplan — Jahressummen in der Tabelle darunter"
          style={{ height: 380 }}
        />
        <ChartTable
          summary="Jahressummen als Tabelle"
          columns={["Jahr", "Summe Investitionen (Ansatz)"]}
          rows={view.stackedYears.map((yy, i) => [String(yy), fmtEur(view.stackedTotals[i])])}
        />
      </section>
    </div>
  );
}
