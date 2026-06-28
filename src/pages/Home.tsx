import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, expenseTreemap, totals, latestYear, type Haushalt } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-line bg-white px-5 py-4 shadow-soft">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function Home() {
  const { data, error } = useData();
  const [haushalt, setHaushalt] = useState<Haushalt>("verwaltung");

  const { option, year, t } = useMemo(() => {
    if (!data) return { option: null, year: 0, t: { einnahmen: 0, ausgaben: 0 } };
    const year = latestYear(data.budget);
    const tree = expenseTreemap(data, year, haushalt);
    const t = totals(data.budget, year);
    const option: EChartsOption = {
      tooltip: {
        formatter: (info: unknown) => {
          const i = info as { name: string; value: number; treePathInfo?: { name: string }[] };
          const path = (i.treePathInfo ?? []).map((p) => p.name).filter(Boolean).join(" › ");
          return `<b>${i.name}</b><br/>${fmtEur(i.value)}${path ? `<br/><span style="color:#888">${path}</span>` : ""}`;
        },
      },
      series: [
        {
          type: "treemap",
          name: "Ausgaben",
          roam: false,
          nodeClick: "zoomToNode",
          data: tree,
          leafDepth: 2,
          breadcrumb: { show: true, top: "bottom" },
          label: { show: true, formatter: "{b}", overflow: "truncate" },
          upperLabel: { show: true, height: 26, color: "#fff", fontWeight: "bold" },
          levels: [
            {
              itemStyle: { borderColor: "#faf7f2", borderWidth: 3, gapWidth: 3 },
            },
            {
              colorSaturation: [0.35, 0.6],
              itemStyle: { borderColorSaturation: 0.7, gapWidth: 1, borderWidth: 1 },
            },
          ],
        },
      ],
    };
    return { option, year, t };
  }, [data, haushalt]);

  if (error)
    return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-4xl font-bold text-ink">Wohin fließt das Geld?</h1>
        <p className="max-w-2xl text-ink-soft">
          Der Haushalt der Stadt Moosburg an der Isar — nach Themen geordnet, statt nach
          Aktenzeichen. Jede Fläche ist eine Ausgabe; je größer, desto mehr Geld.
        </p>
      </section>

      {data && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label={`Ausgaben ${year}`} value={fmtEurShort(t.ausgaben)} hint="Ansatz, beide Haushalte" />
          <Stat label={`Einnahmen ${year}`} value={fmtEurShort(t.einnahmen)} hint="Ansatz, beide Haushalte" />
          <Stat label="Zeitraum" value={`${data.budget.meta.years[0]}–${year}`} hint={`${data.budget.meta.years.length} Jahre`} />
        </section>
      )}

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="font-display text-xl font-bold">
            {haushalt === "verwaltung" ? "Laufende Ausgaben" : "Investitionen"} nach Themen ({year})
          </h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5 text-sm">
              {([
                ["verwaltung", "Laufender Betrieb"],
                ["vermoegen", "Investitionen"],
              ] as [Haushalt, string][]).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setHaushalt(k)}
                  className={
                    "px-3 py-1 rounded-md transition-colors " +
                    (haushalt === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-muted hidden sm:inline">Klick = hineinzoomen</span>
          </div>
        </div>
        {option ? (
          <EChart option={option} style={{ height: 560 }} />
        ) : (
          <div className="h-[560px] grid place-items-center text-ink-muted">Lade Daten …</div>
        )}
      </section>
    </div>
  );
}
