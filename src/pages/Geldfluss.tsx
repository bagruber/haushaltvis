import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, incomeSources, expenseThemes, latestYear } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

const HUB = "Haushalt Moosburg";
const INCOME_COLORS = ["#b8964e", "#967a40", "#c8a86a", "#6e5a30", "#d8c08a"];

export function Geldfluss() {
  const { data, error } = useData();
  const [year, setYear] = useState<number | null>(null);
  const [hideInternal, setHideInternal] = useState(true);

  const view = useMemo(() => {
    if (!data) return null;
    const y = year ?? latestYear(data.budget);
    const inc = incomeSources(data, y, hideInternal, "verwaltung");
    const exp = expenseThemes(data, y, hideInternal, "verwaltung");

    const nodes = [
      ...inc.map((s, i) => ({
        name: s.label,
        itemStyle: { color: INCOME_COLORS[i % INCOME_COLORS.length] },
      })),
      { name: HUB, itemStyle: { color: "#c8102e" } },
      ...exp.map((t) => ({
        name: t.label,
        itemStyle: { color: data.themes.themes[t.key]?.color ?? "#999" },
      })),
    ];
    const links = [
      ...inc.map((s) => ({ source: s.label, target: HUB, value: s.value })),
      ...exp.map((t) => ({ source: HUB, target: t.label, value: t.value })),
    ];

    const option: EChartsOption = {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (p: unknown) => {
          const i = p as { dataType: string; name?: string; value?: number; data?: { source?: string; target?: string } };
          if (i.dataType === "edge")
            return `${i.data?.source} → ${i.data?.target}<br/><b>${fmtEur(i.value!)}</b>`;
          return `<b>${i.name}</b><br/>${fmtEur(i.value!)}`;
        },
      },
      series: [
        {
          type: "sankey",
          left: 8,
          right: 200,
          top: 10,
          bottom: 10,
          nodeWidth: 14,
          nodeGap: 11,
          nodeAlign: "left",
          layoutIterations: 64,
          emphasis: { focus: "adjacency" },
          data: nodes,
          links,
          label: { color: "#1c1c1c", fontSize: 12, formatter: "{b}" },
          lineStyle: { color: "gradient", opacity: 0.45, curveness: 0.5 },
        },
      ],
    };
    const totalIn = inc.reduce((s, x) => s + x.value, 0);
    const totalEx = exp.reduce((s, x) => s + x.value, 0);
    return { option, y, totalIn, totalEx };
  }, [data, year, hideInternal]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Geldfluss</h1>
        <p className="max-w-2xl text-ink-soft">
          Der laufende Betrieb (Verwaltungshaushalt): links die Einnahmequellen, rechts die
          Ausgaben nach Themen. Die Breite jedes Bandes entspricht dem Betrag. Investitionen
          stehen auf den jeweiligen Themenseiten.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {data && (
          <label className="flex items-center gap-2">
            <span className="text-ink-muted">Jahr</span>
            <select
              className="rounded-md border border-ink-line bg-white px-2 py-1"
              value={view?.y}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {data.budget.meta.years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideInternal}
            onChange={(e) => setHideInternal(e.target.checked)}
          />
          <span className="text-ink-soft">Interne Verrechnungen ausblenden</span>
        </label>
      </div>

      {view && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">
            Einnahmen: <b>{fmtEurShort(view.totalIn)}</b>
          </span>
          <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">
            Ausgaben: <b>{fmtEurShort(view.totalEx)}</b>
          </span>
        </div>
      )}

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        {view ? (
          <EChart option={view.option} style={{ height: 640 }} />
        ) : (
          <div className="h-[640px] grid place-items-center text-ink-muted">Lade Daten …</div>
        )}
      </section>

      <p className="text-xs text-ink-muted max-w-2xl">
        Methodik: Beträge sind Haushaltsansätze des Verwaltungshaushalts (laufender Betrieb).
        Der Vermögenshaushalt (Investitionen) ist hier nicht enthalten. „Interne Verrechnungen"
        (Zuführungen zwischen den Haushalten, innere Verrechnungen, Rücklagen, kalkulatorische
        Kosten) sind standardmäßig ausgeblendet, da sie sonst doppelt zählen würden. Dadurch
        weichen Einnahmen- und Ausgabensumme leicht voneinander ab.
      </p>
    </div>
  );
}
