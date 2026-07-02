import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import {
  useData,
  themeYearSeries,
  themeSankey,
  investmentNet,
  topPosten,
  breakdownByAbschnitt,
  latestYear,
  type Data,
  type BudgetEvent,
} from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { Card, Loading } from "@/components/ui";
import { ChartTable } from "@/components/ChartTable";
import { Timeline, TimelineControls, type TimelineMode } from "@/components/Timeline";
import { sankeyTooltip } from "@/lib/charts";
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


export function ThemeDetail() {
  const { id = "" } = useParams();
  const { data, error } = useData();
  const navigate = useNavigate();
  const { year } = useYearCtx();
  const [mode, setMode] = useState<TimelineMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const def = data.themes.themes[id];
    if (!def) return { def: null } as const;
    const y = year ?? latestYear(data.budget);

    const sankey = themeSankey(data, id, y);
    const vwSeries = themeYearSeries(data, id, "A", "verwaltung");
    const vwTop = topPosten(data, id, "A", y, 8, "verwaltung");
    const invest = investmentNet(data, id, y);
    const vmTotal = invest.reduce((s, x) => s + x.invest, 0);
    const vmFoerder = invest.reduce((s, x) => s + x.foerderung, 0);
    const events = gatherEvents(data, id);

    const sankeyOpt: EChartsOption = {
      tooltip: { trigger: "item", formatter: sankeyTooltip },
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
    return { def, y, sankey, sankeyOpt, vwSeries, vwTop, invest, investOpt, vmTotal, vmFoerder, events, hasContext };
  }, [data, id, year]);

  usePageTitle(view && view.def ? view.def.label : undefined);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!view.def)
    return (
      <p className="text-ink-muted">
        Unbekanntes Thema. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { def, y, sankey, sankeyOpt, vwSeries, vwTop, invest, investOpt, vmTotal, vmFoerder, events, hasContext } = view;
  const sankeyHeight = Math.max(360, sankey.nodes.length * 26);
  const sankeyEvents = {
    click: (p: unknown) => {
      const i = p as { dataType?: string; name?: string };
      if (i.dataType !== "node") return;
      const glz = sankey.nav[i.name ?? ""];
      if (glz) navigate(`/einrichtung/${glz}`);
    },
  };

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
            <>
              <p className="text-xs text-ink-muted mb-1">Klick auf eine Einrichtung öffnet ihre Detailseite.</p>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <EChart
                    option={sankeyOpt}
                    onEvents={sankeyEvents}
                    ariaLabel={`Geldfluss ${def.label} ${y}: Einnahmequellen, Bereiche und Einrichtungen — Zahlen in der Tabelle darunter`}
                    style={{ height: sankeyHeight }}
                  />
                </div>
              </div>
              <ChartTable
                summary="Geldfluss als Tabelle"
                columns={["Von", "Nach", "Betrag"]}
                rows={sankey.links.map((l) => [l.source.trim(), l.target.trim(), fmtEur(l.value)])}
              />
            </>
          ) : (
            <p className="text-sm text-ink-muted">Kein laufender Aufwand in diesem Thema.</p>
          )}
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card
            title="Entwicklung der Ausgaben"
            hint={`Plan (Ansatz) gegen Ergebnis (Ist), 2018–${y}. Wert ${y} vorläufig.` + (mode.real ? ` Inflationsbereinigt in Preisen von ${y}.` : "") + (mode.perCapita ? " Je Einwohner." : "")}
          >
            <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} hasInvest={false} />
            <Timeline laufend={vwSeries} mode={mode} context={data!.context} baseYear={y} color={def.color} height={300} />
          </Card>
          <Card title="Größte Kostenpunkte" hint={`Verwaltungshaushalt ${y} — Klick öffnet den Posten`}>
            <ol className="space-y-1.5 text-sm">
              {vwTop.map((p) => (
                <li key={p.key} className="border-b border-ink-line/60 pb-1.5">
                  <Link to={`/posten/${p.key}`} className="flex justify-between gap-3 hover:text-red-600 transition-colors">
                    <span className="text-ink-soft">{p.label}</span>
                    <span className="tabular-nums shrink-0 font-medium">{fmtEur(p.value)}</span>
                  </Link>
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
            {investOpt && (
              <EChart
                option={investOpt}
                ariaLabel={`Investitionen ${def.label} ${y} mit Förderung und Netto-Eigenanteil — Zahlen in der Tabelle darunter`}
                style={{ height: Math.max(280, invest.length * 36 + 80) }}
              />
            )}
            <ChartTable
              columns={["Vorhaben", "Brutto", "Förderung", "Netto"]}
              rows={invest.map((i) => [i.label, fmtEur(i.invest), fmtEur(i.foerderung), fmtEur(i.netto)])}
            />
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
