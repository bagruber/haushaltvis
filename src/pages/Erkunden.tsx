import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { ArrowsLeftRight, ArrowsVertical, CursorClick } from "@phosphor-icons/react";
import { EChart } from "@/components/EChart";
import { useData, kameralBothSidesTree, totals, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { sankeyTooltipMitAnteil } from "@/lib/charts";
import { ChartTable } from "@/components/ChartTable";
import { Loading, SeitenKopf } from "@/components/ui";
import { fmtEur, fmtEurShort } from "@/lib/format";

export function Erkunden() {
  usePageTitle("Haushalt erkunden");
  const { data, error } = useData();
  const navigate = useNavigate();
  const { year: selYear } = useYearCtx();

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const tree = kameralBothSidesTree(data, y);
    const t = totals(data.budget, y);
    const option: EChartsOption = {
      tooltip: { trigger: "item", formatter: sankeyTooltipMitAnteil(tree.total) },
      series: [
        {
          type: "sankey",
          // Room for the longest names in the wider text face ("Wirtschaftliche Unternehmen, allg. Grund-/Sondervermögen").
          left: 250,
          right: 370,
          top: 10,
          bottom: 10,
          nodeWidth: 16,
          nodeGap: 10,
          layoutIterations: 32, // let ECharts minimise crossings at the central hub
          draggable: false,
          cursor: "pointer",
          emphasis: { focus: "adjacency" },
          // The hub's name sits in the column header above, level with the two sides.
          data: tree.nodes.map((n) => (n.depth === 1 ? { ...n, label: { show: false } } : n)),
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
        const i = p as { dataType?: string; name?: string; data?: { source?: string; target?: string } };
        const nav = view?.tree.nav ?? {};
        // A band leads where it flows: to its Einzelplan, or for income to the Einnahmen view.
        const route =
          i.dataType === "node"
            ? nav[i.name ?? ""]
            : i.dataType === "edge"
              ? nav[i.data?.target ?? ""] ?? nav[i.data?.source ?? ""]
              : undefined;
        if (route) navigate(route);
      },
    }),
    [view, navigate],
  );

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  const height = view ? Math.max(460, view.tree.nodes.length * 22) : 560;

  return (
    <div className="space-y-6">
      <SeitenKopf titel="Haushalt erkunden" script="nachvollziehbar">
        <p>Der ganze Haushalt eines Jahres auf einen Blick, von den Einnahmen bis zu den Einzelplänen.</p>
      </SeitenKopf>

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

      <section className="space-y-3 border-t border-ink-line pt-4">
        {/* Reading aid right at the chart: round 1 found the Sankey unfamiliar (3/5). */}
        <ul className="grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
          <li className="flex gap-2">
            <ArrowsLeftRight size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            Links die Einnahmen, rechts die Ausgaben nach Einzelplan.
          </li>
          <li className="flex gap-2">
            <ArrowsVertical size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            Je breiter ein Band, desto mehr Geld fließt.
          </li>
          <li className="flex gap-2">
            <CursorClick size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            Ein Klick auf Balken oder Band führt eine Ebene tiefer.
          </li>
        </ul>
        <p className="text-xs text-ink-muted">
          Interne Verrechnungen sind ausgeblendet. <span className="md:hidden">Auf kleinen Bildschirmen seitlich scrollen.</span>
        </p>
        {view ? (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                {/* Round 1: which side is income was not obvious; the labels now sit over each side. */}
                <div className="relative flex justify-between border-b border-ink-line pb-1.5 text-sm font-semibold">
                  <span>Einnahmen: woher das Geld kommt</span>
                  {/* Over the middle column: the plot runs from 250 px left to 370 px right,
                      the hub sits halfway between, which is 60 px left of the centre. */}
                  <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: "calc(50% - 60px)" }}>
                    Haushalt {view.y}
                  </span>
                  <span>Ausgaben: wohin es geht</span>
                </div>
                <EChart option={view.option} onEvents={onEvents} ariaLabel={`Flussdiagramm des Haushalts ${view.y}: Einnahmen links, Ausgaben nach Einzelplänen rechts, Zahlen in der Tabelle darunter`} style={{ height }} />
              </div>
            </div>
            <ChartTable
              columns={["Seite", "Kategorie", "Betrag"]}
              rows={view.tree.links.map((l) => {
                const isIncome = l.target.startsWith("Haushalt ");
                return [isIncome ? "Einnahmen" : "Ausgaben", (isIncome ? l.source : l.target).trim(), fmtEur(l.value)];
              })}
            />
          </>
        ) : (
          <Loading height={560} />
        )}
      </section>
    </div>
  );
}
