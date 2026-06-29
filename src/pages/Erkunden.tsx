import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useData, kameralExpenseTree, latestYear, type Haushalt } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

type HaushaltFilter = "alle" | Haushalt;

export function Erkunden() {
  const { data, error } = useData();
  const navigate = useNavigate();
  const [hh, setHh] = useState<HaushaltFilter>("alle");

  const view = useMemo(() => {
    if (!data) return null;
    const y = latestYear(data.budget);
    const tree = kameralExpenseTree(data, y, hh === "alle" ? undefined : hh);
    const option: EChartsOption = {
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const i = p as { dataType: string; name?: string; value?: number; data?: { source?: string; target?: string } };
          if (i.dataType === "edge") return `${i.data?.source} → ${i.data?.target}<br/><b>${fmtEur(i.value!)}</b>`;
          return `<b>${i.name}</b><br/>${fmtEur(i.value!)}`;
        },
      },
      series: [
        {
          type: "sankey",
          left: 8,
          right: 220,
          top: 10,
          bottom: 10,
          nodeWidth: 14,
          nodeGap: 12,
          nodeAlign: "left",
          layoutIterations: 0, // keep our deterministic (tree) order → no crossings
          draggable: false,
          emphasis: { focus: "adjacency" },
          data: tree.nodes,
          links: tree.links,
          label: { color: "#1c1c1c", fontSize: 12 },
          lineStyle: { color: "gradient", opacity: 0.45, curveness: 0.5 },
        },
      ],
    };
    return { option, tree, y };
  }, [data, hh]);

  const onEvents = useMemo(
    () => ({
      click: (p: unknown) => {
        const i = p as { dataType?: string; name?: string };
        if (i.dataType !== "node") return;
        const ep = view?.tree.nav[i.name ?? ""];
        if (ep) navigate(`/einzelplan/${ep}`);
      },
    }),
    [view, navigate],
  );

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;

  const height = view ? Math.max(420, view.tree.nodes.length * 20) : 560;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Haushalt erkunden</h1>
        <p className="max-w-2xl text-ink-soft">
          Die Ausgaben nach der kameralen Gliederung der Stadt: <b>Gesamtausgaben → Einzelplan →
          Bereich</b>. Die Breite jedes Bandes entspricht dem Betrag. Die Einnahmen (Steuern,
          Gebühren …) finden sich auf eigenen Seiten.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5">
          {([["alle", "Gesamt"], ["verwaltung", "Laufender Betrieb"], ["vermoegen", "Investitionen"]] as [HaushaltFilter, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setHh(k)}
              className={"px-3 py-1 rounded-md transition-colors " + (hh === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")}
            >
              {l}
            </button>
          ))}
        </div>
        {view && (
          <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">
            Ausgaben {view.y}: <b>{fmtEurShort(view.tree.total)}</b>
          </span>
        )}
      </div>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <p className="text-xs text-ink-muted mb-1">Klick auf einen Einzelplan öffnet seine Detailseite.</p>
        {view ? (
          <EChart option={view.option} onEvents={onEvents} style={{ height }} />
        ) : (
          <div className="h-[560px] grid place-items-center text-ink-muted">Lade Daten …</div>
        )}
      </section>
    </div>
  );
}
