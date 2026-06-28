import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { PackedCircles } from "@/components/PackedCircles";
import { useData, expenseTreemap, totals, latestYear, type Haushalt, type TreeNode } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

type Viz = "sunburst" | "circles" | "treemap";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-line bg-white px-5 py-4 shadow-soft">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function Toggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5 text-sm">
      {options.map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={
            "px-3 py-1 rounded-md transition-colors " +
            (value === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")
          }
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}

export function Home() {
  const { data, error } = useData();
  const navigate = useNavigate();
  const [haushalt, setHaushalt] = useState<Haushalt>("verwaltung");
  const [viz, setViz] = useState<Viz>("sunburst");

  const { tree, year, t } = useMemo(() => {
    if (!data) return { tree: [] as TreeNode[], year: 0, t: { einnahmen: 0, ausgaben: 0 } };
    const year = latestYear(data.budget);
    return { tree: expenseTreemap(data, year, haushalt), year, t: totals(data.budget, year) };
  }, [data, haushalt]);

  const tooltipFmt = (info: unknown) => {
    const i = info as { name: string; value: number; treePathInfo?: { name: string }[] };
    const path = (i.treePathInfo ?? []).map((p) => p.name).filter(Boolean).join(" › ");
    return `<b>${i.name}</b><br/>${fmtEur(i.value)}${path ? `<br/><span style="color:#888">${path}</span>` : ""}`;
  };

  const option: EChartsOption | null = useMemo(() => {
    if (!tree.length) return null;
    if (viz === "treemap") {
      return {
        tooltip: { formatter: tooltipFmt },
        series: [{
          type: "treemap", name: "Ausgaben", roam: false, nodeClick: "zoomToNode",
          data: tree, leafDepth: 2, breadcrumb: { show: true, top: "bottom" },
          label: { show: true, formatter: "{b}", overflow: "truncate" },
          upperLabel: { show: true, height: 26, color: "#fff", fontWeight: "bold" },
          levels: [
            { itemStyle: { borderColor: "#faf7f2", borderWidth: 3, gapWidth: 3 } },
            { itemStyle: { gapWidth: 1, borderWidth: 1, borderColor: "#faf7f2" } },
          ],
        }],
      };
    }
    // sunburst
    return {
      tooltip: { formatter: tooltipFmt },
      series: [{
        type: "sunburst", radius: ["12%", "96%"], data: tree, nodeClick: "rootToNode",
        sort: undefined,
        emphasis: { focus: "ancestor" },
        levels: [
          {},
          { r0: "12%", r: "62%", label: { rotate: "tangential", overflow: "truncate", minAngle: 8 } },
          { r0: "62%", r: "96%", label: { align: "right", overflow: "truncate", minAngle: 5 } },
        ],
        itemStyle: { borderColor: "#faf7f2", borderWidth: 1.5 },
      }],
    };
  }, [tree, viz]);

  const onEvents = useMemo(
    () => ({
      click: (p: unknown) => {
        const d = (p as { data?: TreeNode }).data;
        if (d && !d.children && d.id) navigate(`/themen/${d.id}`);
      },
    }),
    [navigate],
  );

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-4xl font-bold text-ink">Wohin fließt das Geld?</h1>
        <p className="max-w-2xl text-ink-soft">
          Der Haushalt der Stadt Moosburg an der Isar — nach Themen geordnet, statt nach
          Aktenzeichen. Je größer die Fläche, desto mehr Geld.
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-xl font-bold">
            {haushalt === "verwaltung" ? "Laufende Ausgaben" : "Investitionen"} nach Themen ({year})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              value={haushalt}
              onChange={setHaushalt}
              options={[["verwaltung", "Laufender Betrieb"], ["vermoegen", "Investitionen"]]}
            />
            <Toggle
              value={viz}
              onChange={setViz}
              options={[["sunburst", "Ringe"], ["circles", "Kreise"], ["treemap", "Kacheln"]]}
            />
          </div>
        </div>
        <p className="text-xs text-ink-muted mb-2">
          {viz === "circles"
            ? "Klick auf einen Themenkreis öffnet die Themenseite."
            : "Klick auf eine Untergruppe öffnet die Themenseite; Klick auf ein Thema zoomt hinein."}
        </p>
        {!tree.length ? (
          <div className="h-[560px] grid place-items-center text-ink-muted">Lade Daten …</div>
        ) : viz === "circles" ? (
          <PackedCircles data={tree} height={560} onThemeClick={(id) => navigate(`/themen/${id}`)} />
        ) : (
          option && <EChart option={option} onEvents={onEvents} style={{ height: 560 }} />
        )}
      </section>
    </div>
  );
}
