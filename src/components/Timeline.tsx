import { useMemo, useState } from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import { EChart } from "./EChart";
import { ChartTable } from "./ChartTable";
import { DiagrammLegende, type LegendenEintrag, type LegendenForm } from "./DiagrammLegende";
import { Term } from "./Term";
import { adjustSeries, netSeries, type Context, type EA, type TimeMode, type YearSeries, type Zwischen } from "@/lib/data";
import { useBreit, type Notiz } from "@/lib/notiz";
import { SERIEN, useSerien, type SerieKey } from "@/lib/teilen";
import { PLAN_COLOR } from "@/lib/marke.mjs";
import { fmtEur, fmtEurShort, fmtEurFine, fmtPct } from "@/lib/format";

/** Plan is drawn in a neutral tone so it never competes with the Ist colour. */
export { PLAN_COLOR } from "@/lib/marke.mjs";
const REFERENZ_COLOR = "#c4bcac";
/** Investitionen sind in der ganzen App ockerfarbene Balken. */
export const INVEST_COLOR = "#b39f7a";

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
  /**
   * Notiz am Zwischenstand zeigen. Wie die Legende steht sie auf einer Seite
   * mit vielen Diagrammen nur einmal — am ersten, das Rauten hat.
   */
  zwischenNotiz?: boolean;
  /**
   * Legende zeigen. Auf einer Seite mit vielen gleich gebauten Diagrammen
   * (Einzelplan: ein Bereich je Diagramm) steht sie nur über dem ersten —
   * sie gilt ohnehin für alle.
   */
  legende?: boolean;
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

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** "2026-10-01" → "01. Oktober" — der Stichtag, ausgeschrieben. */
function standLang(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}. ${MONATE[Number(m) - 1]}`;
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
export function Timeline({ laufend, invest, einnahmen, mode, context, baseYear, color = "#c8102e", height = 280, art = "A", notiz, legende = true, zwischenNotiz = true }: Props) {
  const breit = useBreit();
  const { aus, an, setAn } = useSerien();
  const [hervor, setHervor] = useState<string | null>(null);
  const { option, table, hinweis, dieNotiz, stand, eintraege } = useMemo(() => {
    const perKopf = (v: number) => `${fmtEurFine(v)}/Kopf`;
    const fmt = (v: number | null) => (v == null ? "-" : mode.perCapita ? perKopf(v) : fmtEur(v));
    const netto = !!(mode.netto && einnahmen);
    const base = netto ? netSeries(laufend, einnahmen!) : laufend;
    const lf = adjustSeries(base, context, mode, baseYear);
    const iv = invest ? adjustSeries(invest, context, mode, baseYear) : null;
    // Keep gross on screen while netted: the distance between the two lines is
    // exactly what fees and charges cover, and that is the point of the view.
    const brutto = netto ? adjustSeries(laufend, context, mode, baseYear) : null;
    // Einnahmen und Ausgaben fallen zu ganz verschiedenen Zeiten im Jahr an;
    // nach neun Monaten wäre ihre Differenz Rauschen. Darum in dieser Ansicht
    // keine Marken, sondern ein Satz, der sagt warum.
    const zw = netto ? undefined : lf.zwischen;
    const zwIndex = zw ? lf.years.indexOf(zw.jahr) : -1;
    const mark = zw ? marken(zw, art) : null;
    const anteil = zwIndex >= 0 ? lf.ansatz[zwIndex] : null;
    const nurHier = (v: number) => lf.years.map((_, i) => (i === zwIndex ? v : null));

    /**
     * Jede Serie einmal beschrieben: Name, Form, Farbe, Daten, Tabellenspalte.
     * Tooltip, Legende und Tabelle lesen dieselbe Liste in derselben Folge —
     * so kann keine der drei aus der Reihe tanzen.
     */
    const bausteine: {
      key: SerieKey;
      name: string;
      form: LegendenForm;
      farbe: string;
      werte: (number | null)[];
      serie: SeriesOption;
    }[] = [];

    // Ist is the fact and carries the colour as a solid line; Plan is an
    // intention and is dashed in a muted tone. Dashing the Ist would signal
    // uncertainty about the one figure that is actually certain.
    bausteine.push({
      key: "ist",
      name: netto ? "Eigenanteil der Stadt (Ist)" : "Ergebnis (Ist)",
      form: "linie",
      farbe: color,
      werte: lf.ergebnis,
      serie: {
        name: netto ? "Eigenanteil der Stadt (Ist)" : "Ergebnis (Ist)",
        type: "line",
        data: lf.ergebnis,
        symbolSize: 7,
        lineStyle: { width: 3, color },
        itemStyle: { color },
        connectNulls: true,
        z: 3,
      },
    });
    bausteine.push({
      key: "plan",
      name: netto ? "Eigenanteil der Stadt (Plan)" : "Ansatz (Plan)",
      form: "gestrichelt",
      farbe: PLAN_COLOR,
      werte: lf.ansatz,
      serie: {
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
    });
    if (zw && zwIndex >= 0 && mark) {
      // Kreis = ganzes Jahr, Raute = Teil des Jahres. Die Farbe trennt Plan von
      // Vollzug wie sonst, die Füllung bezahlt von gebucht. Keine Linie: die
      // Marke gehört zu keiner Reihe, sie ist ein Zwischenruf.
      bausteine.push({
        key: "gebucht",
        name: mark.soll,
        form: "raute-hohl",
        farbe: color,
        werte: nurHier(zw.soll),
        serie: {
          name: mark.soll,
          type: "scatter",
          data: nurHier(zw.soll),
          symbol: "emptyDiamond",
          symbolSize: 10,
          symbolOffset: [-6, 0],
          itemStyle: { color, borderColor: color, borderWidth: 2 },
          z: 4,
        },
      });
      bausteine.push({
        key: "bezahlt",
        name: mark.ist,
        form: "raute-voll",
        farbe: color,
        werte: nurHier(zw.ist),
        serie: {
          name: mark.ist,
          type: "scatter",
          data: nurHier(zw.ist),
          symbol: "diamond",
          symbolSize: 10,
          symbolOffset: [6, 0],
          itemStyle: { color },
          z: 5,
        },
      });
    }
    if (brutto) {
      bausteine.push({
        key: "brutto",
        name: "Ausgaben gesamt",
        form: "linie-duenn",
        farbe: REFERENZ_COLOR,
        werte: brutto.ansatz,
        serie: {
          name: "Ausgaben gesamt",
          type: "line",
          data: brutto.ansatz,
          symbol: "none",
          lineStyle: { width: 1.5, color: REFERENZ_COLOR },
          itemStyle: { color: REFERENZ_COLOR },
          connectNulls: true,
          z: 1,
        },
      });
    }
    if (iv) {
      bausteine.push({
        key: "invest",
        name: "Investitionen",
        form: "balken",
        farbe: INVEST_COLOR,
        werte: iv.ansatz,
        serie: {
          name: "Investitionen",
          type: "bar",
          data: iv.ansatz,
          barWidth: "40%",
          itemStyle: { color: INVEST_COLOR, opacity: 0.85 },
        },
      });
    }

    bausteine.sort((a, b) => SERIEN.indexOf(a.key) - SERIEN.indexOf(b.key));
    const sichtbar = bausteine.filter((b) => (b.key === "invest" ? !!mode.showInvest : !aus.has(b.key)));
    const eintraege: LegendenEintrag[] = bausteine.map(({ key, name, form, farbe }) => ({ key, name, form, farbe }));
    const series = sichtbar.map((b) => b.serie);

    // Die größte Gefahr beim Zwischenstand: jede Raute liegt unter dem Ansatz,
    // und wer nicht weiß, dass nur neun Monate gezählt sind, liest überall
    // "die Stadt gibt weniger aus als geplant". Keine Hochrechnung, keine
    // Dreiviertel-Linie — beide unterstellen gleichmäßiges Ausgeben, und die
    // Kreisumlage, Personalnachzahlungen und Bauschlussrechnungen fallen
    // gehäuft am Jahresende an. Stattdessen ein handschriftlicher Zuruf.
    //
    // Nur eine Notiz je Diagramm: wo schon eine sitzt, gewinnt die vorhandene.
    // Unter 640 px gibt es keine; dort trägt die Achse den Stichtag.
    // Die Notiz gehört zu den beiden Rauten: sind beide ausgeblendet, hat sie
    // nichts mehr zu zeigen.
    const rautenDa = sichtbar.some((b) => b.key === "gebucht" || b.key === "bezahlt");
    const dieNotiz: Notiz | undefined =
      notiz ??
      (zw && zwIndex >= 0 && breit && zwischenNotiz && rautenDa
        ? { text: `Stand ${standLang(zw.stichtag)}`, x: String(zw.jahr), y: zw.ist, form: "kurz" }
        : undefined);

    const option: EChartsOption = {
      // Eigener Formatter, damit die Rauten-Zeilen nur im Jahr des
      // Zwischenstands erscheinen statt in jedem Jahr als "-".
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const zeilen = params as { dataIndex: number; seriesName: string; marker: string; value: number | null }[];
          if (!zeilen.length) return "";
          const i = zeilen[0].dataIndex;
          const text = sichtbar
            .filter((b) => b.werte[i] != null)
            .map((b) => {
              const marker = zeilen.find((z) => z.seriesName === b.name)?.marker ?? "";
              const wert = fmt(b.werte[i]);
              const anteilText =
                b.key === "bezahlt" && anteil ? ` · ${fmtPct(b.werte[i]! / anteil)} des Ansatzes` : "";
              return `<div style="display:flex;gap:12px;justify-content:space-between">
                <span>${marker}${b.name}</span><b>${wert}${anteilText}</b></div>`;
            })
            .join("");
          return `<b>${lf.years[i]}</b>${text}`;
        },
      },
      // Legende abgeschaltet: DiagrammLegende macht dasselbe per Tastatur,
      // mit den echten Symbolen und sichtbar ausgeschalteten Eintraegen.
      legend: { show: false },
      // Eine Notiz braucht Luft über der Grafik (siehe lib/notiz.ts).
      grid: { left: 8, right: 16, top: dieNotiz && dieNotiz.form !== "kurz" ? 56 : 12, bottom: 44, containLabel: true },
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

    // Die Tabelle zeigt, was auch im Bild steht, in derselben Folge.
    const columns = ["Jahr", ...sichtbar.map((b) => b.name)];
    const rows = lf.years.map((y, i) => [
      `${y}${lf.provisional.has(y) ? (zw && y === zw.jahr ? ` (Stand ${standTag(zw.stichtag)})` : " (nur Plan)") : ""}`,
      ...sichtbar.map((b) => (b.werte[i] == null ? "" : fmt(b.werte[i]))),
    ]);

    return {
      option,
      table: { columns, rows },
      // Der Satz steht nur, wo wirklich etwas ausgeblendet wird.
      hinweis: netto && laufend.zwischen ? standLang(laufend.zwischen.stichtag) : null,
      dieNotiz,
      // Wie Legende und Notiz: der Satz steht auf einer Seite nur einmal.
      stand: zw && zwIndex >= 0 && zwischenNotiz && rautenDa ? standTag(zw.stichtag) : undefined,
      eintraege,
    };
  }, [laufend, invest, einnahmen, mode, context, baseYear, color, art, notiz, breit, aus, zwischenNotiz]);

  return (
    <div>
      {legende && (
        <DiagrammLegende eintraege={eintraege} an={an} setAn={setAn} onHervor={setHervor} />
      )}
      <EChart
        option={option}
        notiz={dieNotiz}
        hervor={hervor}
        ariaLabel="Zeitverlauf von Ansatz (Plan) und Ergebnis (Ist), Zahlen in der Tabelle darunter"
        style={{ height }}
      />
      {hinweis && (
        <p className="mt-1 text-xs text-ink-muted">
          Der Zwischenstand zum {hinweis} ist hier ausgeblendet, weil Einnahmen und Ausgaben zu
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

/**
 * Die Schalterzeile trägt nur noch Umrechnungen: **wie** gerechnet wird.
 * **Was** zu sehen ist, steht in der Legende — Investitionen sind eine Serie,
 * keine Rechenart.
 */
export function TimelineControls({
  mode,
  setMode,
  hasContext,
  hasEinnahmen,
}: {
  mode: TimelineMode;
  setMode: (fn: (m: TimelineMode) => TimelineMode) => void;
  hasContext: boolean;
  hasEinnahmen?: boolean;
}) {
  if (!hasContext && !hasEinnahmen) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-1">
      <span className="text-ink-muted">Rechnen</span>
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
