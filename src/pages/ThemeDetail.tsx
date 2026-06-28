import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  themeYearSeries,
  themeSankey,
  investmentNet,
  topPosten,
  breakdownByAbschnitt,
  adjustSeries,
  latestYear,
  type Data,
  type BudgetEvent,
  type TimeMode,
} from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

function gatherEvents(data: Data, themeId: string): BudgetEvent[] {
  const year = latestYear(data.budget);
  const abs = new Set([
    ...breakdownByAbschnitt(data, themeId, "A", year).map((x) => x.key),
    ...breakdownByAbschnitt(data, themeId, "E", year).map((x) => x.key),
  ]);
  return data.events
    .filter(
      (e) =>
        (e.scope === "theme" && e.id === themeId) ||
        (e.scope === "abschnitt" && abs.has(e.id)),
    )
    .sort((a, b) => a.year - b.year);
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="text-xs text-ink-muted mb-2">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

export function ThemeDetail() {
  const { id = "" } = useParams();
  const { data, error } = useData();
  const [year] = useState<number | null>(null);
  const [mode, setMode] = useState<TimeMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const def = data.themes.themes[id];
    if (!def) return { def: null } as const;
    const y = year ?? latestYear(data.budget);
    const unit = mode.perCapita ? " €/Kopf" : "";
    const fmt = (v: number) => (mode.perCapita ? `${fmtEur(v)}${unit}` : fmtEur(v));

    const sankey = themeSankey(data, id, y);
    const vwSeries = adjustSeries(themeYearSeries(data, id, "A", "verwaltung"), data.context, mode, y);
    const vwTop = topPosten(data, id, "A", y, 8, "verwaltung");
    const invest = investmentNet(data, id, y);
    const vmTotal = invest.reduce((s, x) => s + x.invest, 0);
    const vmFoerder = invest.reduce((s, x) => s + x.foerderung, 0);
    const events = gatherEvents(data, id);

    const sankeyOpt: EChartsOption = {
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
          right: 190,
          top: 10,
          bottom: 10,
          nodeWidth: 12,
          nodeGap: 12,
          nodeAlign: "left",
          layoutIterations: 64,
          draggable: false,
          emphasis: { focus: "adjacency" },
          data: sankey.nodes,
          links: sankey.links,
          label: { color: "#1c1c1c", fontSize: 11 },
          lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
        },
      ],
    };

    const timelineOpt: EChartsOption = {
      color: [def.color, "#967a40"],
      tooltip: { trigger: "axis", valueFormatter: (v) => (v == null ? "—" : fmt(v as number)) },
      legend: { bottom: 0 },
      grid: { left: 64, right: 20, top: 16, bottom: 48 },
      xAxis: { type: "category", data: vwSeries.years.map(String) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? `${fmtEur(v)}${unit}` : fmtEurShort(v)) } },
      series: [
        { name: "Ansatz (Plan)", type: "line", data: vwSeries.ansatz, symbolSize: 7, lineStyle: { width: 3 }, connectNulls: true },
        { name: "Ergebnis (Ist)", type: "line", data: vwSeries.ergebnis, symbol: "emptyCircle", symbolSize: 7, lineStyle: { width: 2, type: "dashed" }, connectNulls: true },
      ],
    };

    const investOpt: EChartsOption | null = invest.length
      ? {
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: (v) => fmtEur(v as number),
          },
          legend: { bottom: 0 },
          grid: { left: 8, right: 24, top: 16, bottom: 48, containLabel: true },
          xAxis: { type: "value", axisLabel: { formatter: (v: number) => fmtEurShort(v) } },
          yAxis: {
            type: "category",
            inverse: true,
            data: invest.map((i) => i.label),
            axisLabel: { width: 160, overflow: "truncate", fontSize: 11 },
          },
          series: [
            {
              name: "Förderung / Einnahmen",
              type: "bar",
              stack: "x",
              data: invest.map((i) => i.foerderung),
              itemStyle: { color: "#0a9e4c" },
            },
            {
              name: "Netto-Eigenanteil der Stadt",
              type: "bar",
              stack: "x",
              data: invest.map((i) => Math.max(0, i.netto)),
              itemStyle: { color: def.color },
            },
          ],
        }
      : null;

    const hasContext = !!(data.context.cpi || data.context.population);
    return { def, y, sankey, sankeyOpt, timelineOpt, vwTop, invest, investOpt, vmTotal, vmFoerder, events, hasContext };
  }, [data, id, year, mode]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!view.def)
    return (
      <p className="text-ink-muted">
        Unbekanntes Thema. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { def, y, sankey, sankeyOpt, timelineOpt, vwTop, invest, investOpt, vmTotal, vmFoerder, events, hasContext } = view;
  const sankeyHeight = Math.max(360, sankey.nodes.length * 26);

  return (
    <div className="space-y-10">
      <nav className="text-sm text-ink-muted">
        <Link to="/themen" className="hover:text-ink">Themen</Link> ›{" "}
        <span className="text-ink">{def.label}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-block h-5 w-5 rounded" style={{ background: def.color }} />
          <h1 className="font-display text-3xl font-bold">{def.label}</h1>
        </div>
        <p className="max-w-2xl text-ink-soft">{def.description}</p>
      </header>

      {/* ── Verwaltungshaushalt ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-baseline gap-3 border-b border-ink-line pb-1">
          <h2 className="font-display text-2xl font-bold">Laufender Betrieb</h2>
          <span className="text-sm text-ink-muted">Verwaltungshaushalt {y}</span>
        </div>

        <Card
          title="Geldfluss"
          hint={`Woher das Geld kommt und wofür es im laufenden Betrieb ausgegeben wird. Eigene Einnahmen ${fmtEurShort(sankey.income)}, Zuschuss aus allgemeinen Haushaltsmitteln ${fmtEurShort(sankey.zuschuss)}.`}
        >
          {sankey.links.length ? (
            <EChart option={sankeyOpt} style={{ height: sankeyHeight }} />
          ) : (
            <p className="text-sm text-ink-muted">Kein laufender Aufwand in diesem Thema.</p>
          )}
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card
            title="Entwicklung der Ausgaben"
            hint={
              `Plan (Ansatz) gegen Ergebnis (Ist), 2018–${y}. Wert ${y} vorläufig.` +
              (mode.real ? ` Inflationsbereinigt in Preisen von ${y}.` : "") +
              (mode.perCapita ? " Je Einwohner." : "")
            }
          >
            {hasContext && (
              <div className="flex flex-wrap gap-4 text-xs mb-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!mode.real}
                    onChange={(e) => setMode((m) => ({ ...m, real: e.target.checked }))}
                  />
                  <span>inflationsbereinigt</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!mode.perCapita}
                    onChange={(e) => setMode((m) => ({ ...m, perCapita: e.target.checked }))}
                  />
                  <span>je Einwohner</span>
                </label>
              </div>
            )}
            <EChart option={timelineOpt} style={{ height: 300 }} />
          </Card>
          <Card title="Größte Kostenpunkte" hint={`Verwaltungshaushalt ${y}`}>
            <ol className="space-y-1.5 text-sm">
              {vwTop.map((p) => (
                <li key={p.key} className="flex justify-between gap-3 border-b border-ink-line/60 pb-1.5">
                  <span className="text-ink-soft">{p.label}</span>
                  <span className="tabular-nums shrink-0 font-medium">{fmtEur(p.value)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {/* ── Vermögenshaushalt ─────────────────────────────────── */}
      {invest.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 border-b border-ink-line pb-1">
            <h2 className="font-display text-2xl font-bold">Investitionen</h2>
            <span className="text-sm text-ink-muted">Vermögenshaushalt {y}</span>
          </div>

          <Card
            title="Was Investitionen netto kosten"
            hint={`Brutto-Investitionen ${fmtEurShort(vmTotal)}, davon durch Förderungen/Einnahmen gedeckt ${fmtEurShort(vmFoerder)}. Der farbige Teil bleibt an der Stadt hängen.`}
          >
            {investOpt && <EChart option={investOpt} style={{ height: Math.max(280, invest.length * 36 + 80) }} />}
          </Card>
        </div>
      )}

      {/* ── Ereignisse ────────────────────────────────────────── */}
      <Card title="Ereignisse">
        {events.length === 0 ? (
          <p className="text-sm text-ink-muted">Noch keine Ereignisse hinterlegt.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display font-bold text-red-600 tabular-nums shrink-0 w-12">{e.year}</span>
                <div>
                  <div className="font-medium">
                    {e.title}
                    {(e as { _auto?: boolean })._auto && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-muted">automatisch erkannt</span>
                    )}
                  </div>
                  {e.text && <div className="text-sm text-ink-muted">{e.text}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
