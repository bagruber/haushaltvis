import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./EChart";
import { ChartTable } from "./ChartTable";
import { Term } from "./Term";
import { adjustSeries, netSeries, type Context, type EA, type TimeMode, type YearSeries, type Zwischen } from "@/lib/data";
import { useBreit, type Notiz } from "@/lib/notiz";
import { fmtEur, fmtEurShort, fmtEurFine, fmtPct } from "@/lib/format";

/** Plan is drawn in a neutral tone so it never competes with the Ist colour. */
export const PLAN_COLOR = "#8a7a5c";
const REFERENZ_COLOR = "#c4bcac";

export interface TimelineMode extends TimeMode {
  showInvest?: boolean;
  /** show Zuschussbedarf (Ausgaben − Einnahmen) instead of gross expenses */
  netto?: boolean;
}

interface Props {
  /** Verwaltungshaushalt (laufender Betrieb) — drawn as lines. */
  laufend: YearSeries;
  /** Vermögenshaushalt (Investitionen) — drawn as bars when mode.showInvest. */
  invest?: YearSeries;
  /** Einnahmen of the same scope — enables the bilanziert (netto) view. */
  einnahmen?: YearSeries;
  mode: TimelineMode;
  context: Context;
  baseYear: number;
  color?: string;
  height?: number;
  /** Ausgaben or Einnahmen — only the wording of the Stichtag marks differs. */
  art?: EA;
  /** Handwritten note; only used where the chart has none of its own. */
  notiz?: Notiz;
}

/** "2026-10-01" → "1.10." — the day the figures were taken. */
function standTag(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

/** The last day the figures cover: the day before the Stichtag. */
function vortag(iso: string): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** "2026-10-01" → "30.09." — the last day the figures cover. */
function bisTag(iso: string): string {
  const d = vortag(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.`;
}

/**
 * Whole months the figures cover. A Stichtag in mid-month counts the running
 * month not at all — the note may understate the period, never overstate it.
 */
function monateBis(iso: string): number {
  const d = vortag(iso);
  const letzterImMonat = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCMonth() + (d.getUTCDate() === letzterImMonat ? 1 : 0);
}

/**
 * The two marks of the Stichtag. Expenses are ordered and then paid, income is
 * assessed and then received — the same two columns, different words.
 */
function marken(zw: Zwischen, art: EA) {
  const bis = bisTag(zw.stichtag);
  return art === "E"
    ? { soll: `festgesetzt bis ${bis}`, ist: `eingegangen bis ${bis}` }
    : { soll: `gebucht bis ${bis}`, ist: `bezahlt bis ${bis}` };
}

/**
 * Ansatz-vs-Ergebnis timeline. Laufende Kosten (VwHH) as lines; Investitionen
 * (VmHH) — lumpy year to year — as bars, only when explicitly enabled.
 */
export function Timeline({ laufend, invest, einnahmen, mode, context, baseYear, color = "#c8102e", height = 280, art = "A", notiz }: Props) {
  const breit = useBreit();
  const { option, table, hinweis, dieNotiz, stand } = useMemo(() => {
    const perKopf = (v: number) => `${fmtEurFine(v)}/Kopf`;
    const fmt = (v: number | null) => (v == null ? "-" : mode.perCapita ? perKopf(v) : fmtEur(v));
    const netto = !!(mode.netto && einnahmen);
    const base = netto ? netSeries(laufend, einnahmen!) : laufend;
    const lf = adjustSeries(base, context, mode, baseYear);
    const iv = invest && mode.showInvest ? adjustSeries(invest, context, mode, baseYear) : null;
    // Keep gross on screen while netted: the distance between the two lines is
    // exactly what fees and charges cover, and that is the point of the view.
    const brutto = netto ? adjustSeries(laufend, context, mode, baseYear) : null;
    // Einnahmen und Ausgaben fallen zu ganz verschiedenen Zeiten im Jahr an;
    // nach neun Monaten wäre ihre Differenz Rauschen. Darum in dieser Ansicht
    // keine Marken, sondern ein Satz, der sagt warum.
    const zw = netto ? undefined : lf.zwischen;
    const zwIndex = zw ? lf.years.indexOf(zw.jahr) : -1;
    const mark = zw ? marken(zw, art) : null;

    // Ist is the fact and carries the colour as a solid line; Plan is an
    // intention and is dashed in a muted tone. Dashing the Ist would signal
    // uncertainty about the one figure that is actually certain.
    const series: NonNullable<EChartsOption["series"]> = [
      {
        name: netto ? "Eigenanteil der Stadt (Ist)" : "Ergebnis (Ist)",
        type: "line",
        data: lf.ergebnis,
        symbolSize: 7,
        lineStyle: { width: 3, color },
        itemStyle: { color },
        connectNulls: true,
        z: 3,
      },
      {
        name: netto ? "Eigenanteil der Stadt (Plan)" : "Ansatz (Plan)",
        type: "line",
        data: lf.ansatz,
        symbol: "emptyCircle",
        symbolSize: 6,
        lineStyle: { width: 2, type: "dashed", color: PLAN_COLOR },
        itemStyle: { color: PLAN_COLOR },
        connectNulls: true,
        z: 2,
      },
    ];
    if (brutto) {
      series.push({
        name: "Ausgaben gesamt",
        type: "line",
        data: brutto.ansatz,
        symbol: "none",
        lineStyle: { width: 1.5, color: REFERENZ_COLOR },
        itemStyle: { color: REFERENZ_COLOR },
        connectNulls: true,
        z: 1,
      });
    }
    if (iv) {
      series.push({ name: "Investitionen (Ansatz)", type: "bar", data: iv.ansatz, barWidth: "40%", itemStyle: { color: "#b39f7a", opacity: 0.85 } });
    }
    if (zw && zwIndex >= 0 && mark) {
      // Kreis = ganzes Jahr, Raute = Teil des Jahres. Die Farbe trennt Plan von
      // Vollzug wie sonst, die Füllung bezahlt von gebucht. Keine Linie: die
      // Marke gehört zu keiner Reihe, sie ist ein Zwischenruf.
      const anteil = lf.ansatz[zwIndex];
      const nurHier = (v: number) => lf.years.map((_, i) => (i === zwIndex ? v : null));
      series.push(
        {
          name: mark.soll,
          type: "scatter",
          data: nurHier(zw.soll),
          symbol: "emptyDiamond",
          symbolSize: 10,
          symbolOffset: [-6, 0],
          itemStyle: { color, borderColor: color, borderWidth: 2 },
          z: 4,
        },
        {
          name: mark.ist,
          type: "scatter",
          data: nurHier(zw.ist),
          symbol: "diamond",
          symbolSize: 10,
          symbolOffset: [6, 0],
          itemStyle: { color },
          z: 5,
          tooltip: {
            valueFormatter: (v) =>
              anteil ? `${fmt(v as number)} · ${fmtPct((v as number) / anteil)} des Ansatzes` : fmt(v as number),
          },
        },
      );
    }

    // Die größte Gefahr beim Zwischenstand: jede Raute liegt unter dem Ansatz,
    // und wer nicht weiß, dass nur neun Monate gezählt sind, liest überall
    // "die Stadt gibt weniger aus als geplant". Keine Hochrechnung, keine
    // Dreiviertel-Linie — beide unterstellen gleichmäßiges Ausgeben, und die
    // Kreisumlage, Personalnachzahlungen und Bauschlussrechnungen fallen
    // gehäuft am Jahresende an. Stattdessen ein handschriftlicher Zuruf.
    //
    // Nur eine Notiz je Diagramm: wo schon eine sitzt, gewinnt die vorhandene.
    // Unter 640 px gibt es keine; dort trägt die Achse den Stichtag.
    const dieNotiz: Notiz | undefined =
      notiz ??
      (zw && zwIndex >= 0 && breit
        ? { text: `erst ${monateBis(zw.stichtag)} Monate`, x: String(zw.jahr), y: zw.ist }
        : undefined);

    const option: EChartsOption = {
      tooltip: { trigger: "axis", valueFormatter: (v) => fmt(v as number | null) },
      legend: { bottom: 0 },
      // Eine Notiz braucht Luft über der Grafik (siehe lib/notiz.ts).
      grid: { left: 8, right: 16, top: dieNotiz ? 56 : 12, bottom: 44, containLabel: true },
      xAxis: {
        type: "category",
        data: laufend.years.map(String),
        axisLabel: zw
          ? {
              formatter: (v: string) => (v === String(zw.jahr) ? `${v}\n{stand|Stand ${standTag(zw.stichtag)}}` : v),
              rich: { stand: { fontSize: 10, lineHeight: 15, color: "#8a8170" } },
            }
          : undefined,
      },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => (mode.perCapita ? fmtEurFine(v) : fmtEurShort(v)) } },
      series,
    };

    const columns = [
      "Jahr",
      netto ? "Eigenanteil der Stadt (Ist)" : "Ergebnis (Ist)",
      netto ? "Eigenanteil der Stadt (Plan)" : "Ansatz (Plan)",
      ...(brutto ? ["Ausgaben gesamt"] : []),
      ...(iv ? ["Investitionen (Ansatz)"] : []),
      ...(mark ? [mark.soll, mark.ist] : []),
    ];
    const rows = lf.years.map((y, i) => [
      `${y}${lf.provisional.has(y) ? (zw && y === zw.jahr ? ` (Stand ${standTag(zw.stichtag)})` : " (nur Plan)") : ""}`,
      fmt(lf.ergebnis[i]),
      fmt(lf.ansatz[i]),
      ...(brutto ? [fmt(brutto.ansatz[i])] : []),
      ...(iv ? [fmt(iv.ansatz[i])] : []),
      ...(zw && mark ? (i === zwIndex ? [fmt(zw.soll), fmt(zw.ist)] : ["", ""]) : []),
    ]);

    return {
      option,
      table: { columns, rows },
      // Der Satz steht nur, wo wirklich etwas ausgeblendet wird.
      hinweis: !!(netto && laufend.zwischen),
      dieNotiz,
      stand: zw && zwIndex >= 0 ? standTag(zw.stichtag) : undefined,
    };
  }, [laufend, invest, einnahmen, mode, context, baseYear, color, art, notiz, breit]);

  return (
    <div>
      <EChart
        option={option}
        notiz={dieNotiz}
        ariaLabel="Zeitverlauf von Ansatz (Plan) und Ergebnis (Ist), Zahlen in der Tabelle darunter"
        style={{ height }}
      />
      {hinweis && (
        <p className="mt-1 text-xs text-ink-muted">
          Der Zwischenstand nach neun Monaten ist hier ausgeblendet, weil Einnahmen und Ausgaben zu
          verschiedenen Zeiten im Jahr anfallen.
        </p>
      )}
      {/* Der Satz steht da, wo die Notiz im Diagramm nicht hinkommt (unter
          640 px gibt es keine), und traegt den Begriff ins Glossar. */}
      {stand && (
        <p className="mt-1 text-xs text-ink-muted">
          Die Rauten sind der <Term name="zwischenstand">Zwischenstand</Term> zum {stand}, also erst
          ein Teil des Jahres.
        </p>
      )}
      <ChartTable columns={table.columns} rows={table.rows} />
    </div>
  );
}

/** Re-usable checkbox row for timeline options. */
export function TimelineControls({
  mode,
  setMode,
  hasContext,
  hasInvest,
  hasEinnahmen,
}: {
  mode: TimelineMode;
  setMode: (fn: (m: TimelineMode) => TimelineMode) => void;
  hasContext: boolean;
  hasInvest: boolean;
  hasEinnahmen?: boolean;
}) {
  if (!hasContext && !hasInvest && !hasEinnahmen) return null;
  return (
    <div className="flex flex-wrap gap-4 text-xs mb-1">
      {hasInvest && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!mode.showInvest} onChange={(e) => setMode((m) => ({ ...m, showInvest: e.target.checked }))} />
          <span>Investitionen zeigen</span>
        </label>
      )}
      {hasContext && (
        <>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!mode.real} onChange={(e) => setMode((m) => ({ ...m, real: e.target.checked }))} />
            <span>inflationsbereinigt</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!mode.perCapita} onChange={(e) => setMode((m) => ({ ...m, perCapita: e.target.checked }))} />
            <span>je Einwohner</span>
          </label>
        </>
      )}
      {hasEinnahmen && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!mode.netto} onChange={(e) => setMode((m) => ({ ...m, netto: e.target.checked }))} />
          {/* Round 1: "bilanziert (Zuschussbedarf)" was misread; plain words instead. */}
          <span title="Ausgaben abzüglich eigener Einnahmen wie Gebühren und Entgelte">
            mit Einnahmen verrechnet
          </span>
        </label>
      )}
    </div>
  );
}
