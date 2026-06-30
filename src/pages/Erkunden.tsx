import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, kameralBothSidesTree, totals, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { sankeyTooltip } from "@/lib/charts";
import { fmtEurShort } from "@/lib/format";

export function Erkunden() {
  const { data, error } = useData();
  const navigate = useNavigate();
  const { year: selYear } = useYearCtx();

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const tree = kameralBothSidesTree(data, y);
    const t = totals(data.budget, y);
    const option: EChartsOption = {
      tooltip: { trigger: "item", formatter: sankeyTooltip },
      series: [
        {
          type: "sankey",
          left: 210,
          right: 230,
          top: 10,
          bottom: 10,
          nodeWidth: 16,
          nodeGap: 10,
          layoutIterations: 32, // let ECharts minimise crossings at the central hub
          draggable: false,
          emphasis: { focus: "adjacency" },
          data: tree.nodes,
          links: tree.links,
          label: { color: "#1c1c1c", fontSize: 12 },
          lineStyle: { color: "gradient", opacity: 0.45, curveness: 0.5 },
        },
      ],
    };
    return { option, tree, y, t };
  }, [data, selYear]);

  const onEvents = useMemo(
    () => ({
      click: (p: unknown) => {
        const i = p as { dataType?: string; name?: string };
        if (i.dataType !== "node") return;
        const route = view?.tree.nav[i.name ?? ""];
        if (route) navigate(route);
      },
    }),
    [view, navigate],
  );

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  const height = view ? Math.max(460, view.tree.nodes.length * 22) : 560;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Haushalt erkunden</h1>
        <p className="max-w-2xl text-ink-soft">
          Der ganze Haushalt auf einen Blick: <b>links</b> woher das Geld kommt (Einnahmen),
          in der Mitte der Gesamthaushalt, <b>rechts</b> wohin es geht (Ausgaben nach
          Einzelplänen). Klick auf eine Einnahmeart oder einen Einzelplan führt eine Ebene tiefer.
        </p>
      </header>

      {view && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">
            Einnahmen {view.y}: <b>{fmtEurShort(view.t.einnahmen)}</b>
          </span>
          <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">
            Ausgaben {view.y}: <b>{fmtEurShort(view.t.ausgaben)}</b>
          </span>
        </div>
      )}

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <p className="text-xs text-ink-muted mb-1">Interne Verrechnungen sind ausgeblendet.</p>
        {view ? (
          <EChart option={view.option} onEvents={onEvents} ariaLabel={`Flussdiagramm des Haushalts ${view.y}: Einnahmen links, Ausgaben nach Einzelplänen rechts`} style={{ height }} />
        ) : (
          <div className="h-[560px] grid place-items-center text-ink-muted">Lade Daten …</div>
        )}
      </section>
    </div>
  );
}
