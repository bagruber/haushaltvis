import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, investmentsAll, investmentStacked, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { EINZELPLAN_COLORS } from "@/lib/colors";
import { Stat } from "@/components/ui";
import { fmtEur, fmtEurShort } from "@/lib/format";

const TOP = 18;

export function Investitionen() {
  const { data, error } = useData();
  const navigate = useNavigate();

  const { year: selYear } = useYearCtx();
  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const inv = investmentsAll(data, y);
    const top = inv.items.slice(0, TOP);
    const cats = top.map((i) => i.label);
    const option: EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => fmtEur(v as number),
      },
      legend: { bottom: 0 },
      grid: { left: 8, right: 24, top: 8, bottom: 40, containLabel: true },
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
      yAxis: {
        type: "category",
        inverse: true,
        data: cats,
        axisLabel: { width: 200, overflow: "truncate", fontSize: 11 },
      },
      series: [
        {
          // capped at gross so a fully/over-funded item doesn't overshoot the bar
          name: "Förderung / Einnahmen",
          type: "bar",
          stack: "x",
          data: top.map((i) => Math.min(i.foerderung, i.invest)),
          itemStyle: { color: "#0a9e4c" },
        },
        {
          name: "Netto-Eigenanteil der Stadt",
          type: "bar",
          stack: "x",
          data: top.map((i) => ({ value: Math.max(0, i.invest - i.foerderung), itemStyle: { color: EINZELPLAN_COLORS[i.einzelplan] ?? "#999" } })),
        },
      ],
    };
    const stacked = investmentStacked(data, 12);
    const stackedOpt: EChartsOption = {
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => (v ? fmtEur(v as number) : "—"),
        order: "valueDesc",
      },
      legend: { type: "scroll", bottom: 0 },
      grid: { left: 64, right: 16, top: 12, bottom: 56 },
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

    return { y, inv, top, option, stackedOpt };
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
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;

  const { y, inv } = view;
  const foerderquote = inv.totalInvest ? inv.totalFoerder / inv.totalInvest : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Investitionen {y}</h1>
        <p className="max-w-2xl text-ink-soft">
          Der Vermögenshaushalt: Bauten, Grundstücke und Anschaffungen. Grün zeigt, wie viel
          durch Förderungen, Zuschüsse und Verkäufe wieder hereinkommt — der farbige Rest ist
          der Netto-Eigenanteil der Stadt.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Brutto-Investitionen" value={fmtEurShort(inv.totalInvest)} hint={`${inv.items.length} Vorhaben`} />
        <Stat label="Förderung / Einnahmen" value={fmtEurShort(inv.totalFoerder)} hint={`${Math.round(foerderquote * 100)}% refinanziert`} />
        <Stat label="Netto-Eigenanteil" value={fmtEurShort(inv.totalInvest - inv.totalFoerder)} hint="aus allg. Haushalt/Krediten" />
      </section>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Investitionen über die Jahre</h2>
          <span className="text-xs text-ink-muted">Ansätze, gestapelt nach Thema; größte Vorhaben einzeln</span>
        </div>
        <EChart option={view.stackedOpt} style={{ height: 380 }} />
        <p className="text-xs text-ink-muted mt-1">
          Jede Fläche ist ein Vorhaben (große einzeln, kleinere als „Sonstige · Thema" gebündelt).
          Mehrfach-Themen werden hier ihrem Hauptthema zugerechnet, damit die Summe stimmt.
        </p>
      </section>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="font-display text-lg font-bold">Größte Vorhaben {view.y}</h2>
          <span className="text-xs text-ink-muted">Klick öffnet die Einrichtung</span>
        </div>
        <EChart option={view.option} onEvents={onEvents} style={{ height: TOP * 30 + 60 }} />
      </section>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold mb-2">Alle Investitionen</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="text-left text-ink-muted border-b border-ink-line">
            <tr>
              <th className="py-1.5 font-medium">Vorhaben</th>
              <th className="py-1.5 font-medium text-right">Brutto</th>
              <th className="py-1.5 font-medium text-right">Förderung</th>
              <th className="py-1.5 font-medium text-right">Netto</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((i) => (
              <tr key={i.glz} className="border-b border-ink-line/50">
                <td className="py-1.5">
                  <Link to={`/einrichtung/${i.glz}`} className="hover:text-red-600 transition-colors flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: EINZELPLAN_COLORS[i.einzelplan] ?? "#999" }} />
                    {i.label}
                  </Link>
                </td>
                <td className="py-1.5 text-right tabular-nums">{fmtEur(i.invest)}</td>
                <td className="py-1.5 text-right tabular-nums text-[#0a9e4c]">{i.foerderung ? fmtEur(i.foerderung) : "—"}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{fmtEur(i.netto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
