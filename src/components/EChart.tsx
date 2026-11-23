import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, SankeyChart, ScatterChart, SunburstChart, TreemapChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, GridComponent, AriaComponent, GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { Notiz } from "@/lib/notiz";

// Register only what we actually use — keeps the bundle small.
echarts.use([
  BarChart, LineChart, SankeyChart, ScatterChart, SunburstChart, TreemapChart,
  TooltipComponent, LegendComponent, GridComponent, AriaComponent, GraphicComponent,
  CanvasRenderer,
]);

type Chart = ReturnType<typeof echarts.init>;

interface Props {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
  /** Accessible description of the chart for screen readers. */
  ariaLabel?: string;
  /** Handwritten note; pass a memoised object, a new one on every render redraws the chart. */
  notiz?: Notiz;
  /**
   * Name der Serie, die gerade hervorgehoben wird (Zeiger oder Fokus auf der
   * Legende). Die uebrigen verblassen — was die ECharts-Legende von sich aus
   * tat und unsere eigene nun ausloest.
   */
  hervor?: string | null;
}

const NOTIZ_TINTE = "#6e5a30"; // gold-700
const NOTIZ_PFEIL = "#b8964e"; // gold-500

/**
 * Handwritten note: the text in the free margin above the plot, where no line
 * crosses it, and a curved arrow from there down to the data point. Pixel
 * positions exist only after layout, so this runs after every setOption and
 * resize. The option needs a grid top of about 56 px to leave room.
 */
function zeichneNotiz(chart: Chart, notiz: Notiz | undefined, deckkraft = 1, sichtbar = true) {
  if (!notiz) return;
  // The plot rectangle is not in the public API; the grid model exposes it.
  const modell = chart as unknown as {
    getModel(): { getComponent(t: string, i: number): { coordinateSystem: { getRect(): { x: number; y: number; width: number; height: number } } } } | undefined;
  };
  // A resize can fire before the first setOption — there is no grid to measure
  // yet, and the note is drawn again right after the option arrives.
  const gitter = modell.getModel()?.getComponent("grid", 0);
  if (!gitter) return;
  const [px, py] = chart.convertToPixel({ gridIndex: 0 }, [notiz.x, notiz.y]) as number[];
  const rect = gitter.coordinateSystem.getRect();
  const script = getComputedStyle(document.documentElement).getPropertyValue("--font-script");
  const strich = { stroke: NOTIZ_PFEIL, lineWidth: 1.6, fill: "none", lineCap: "round" as const, lineJoin: "round" as const };

  if (notiz.form === "kurz") {
    // Kurze Form: der Punkt liegt am rechten Rand. Der Text steht darunter,
    // bündig mit dem rechten Rand der Grafik, ein kurzer Strich führt schräg
    // hinauf zum Punkt. Unter dem letzten Jahr ist fast immer frei — die Linien
    // enden darüber —, so legt sich die Notiz nicht über die Daten. Liegt dort
    // ein Punkt, den sie nicht verdecken darf, rückt sie weiter nach unten;
    // nur wenn unten kein Platz mehr ist, weicht sie nach oben aus.
    const font = `26px ${script}`;
    const mass = document.createElement("canvas").getContext("2d");
    if (mass) mass.font = font;
    const breite = mass?.measureText(notiz.text).width ?? notiz.text.length * 9;
    const rechts = rect.x + rect.width;
    const meiden = (notiz.meiden ?? []).map((m) => chart.convertToPixel({ gridIndex: 0 }, [m.x, m.y]) as number[]);
    const frei = (y: number) =>
      meiden.every(([mx, my]) => mx < rechts - breite - 8 || mx > rechts + 8 || my < y - 21 || my > y + 21);
    // In niedrigen Diagrammen ist unter den Rauten wenig Platz: dann rückt der
    // Text bis knapp über die Achse, solange er die Rauten nicht berührt.
    const tiefst = rect.y + rect.height - 13;
    const unter = [py + 36, py + 62].map((y) => Math.min(y, tiefst)).filter((y) => y >= py + 22);
    const imBild = (y: number) => y > rect.y + 14 && y <= tiefst;
    const textY = [...unter, py - 36].find((y) => imBild(y) && frei(y)) ?? unter[0] ?? py - 36;
    const unten = textY > py;
    // Der Strich endet knapp neben der rechten Raute (bezahlt, 6 px versetzt).
    const ende = [px + 9, unten ? py + 8 : py - 8];
    const start = [Math.min(rechts - 6, ende[0] + 22), unten ? textY - 14 : textY + 14];
    const winkel = Math.atan2(ende[1] - start[1], ende[0] - start[0]);
    const spitze = (d: number) => [ende[0] - 8 * Math.cos(winkel + d), ende[1] - 8 * Math.sin(winkel + d)];
    chart.setOption({
      graphic: {
        elements: [
          {
            id: "notiz-text",
            type: "text",
            x: rechts,
            y: textY,
            rotation: 0.03,
            silent: true,
            z: 100,
            invisible: !sichtbar,
            style: { text: notiz.text, font, fill: NOTIZ_TINTE, align: "right", verticalAlign: "middle", opacity: deckkraft },
          },
          {
            id: "notiz-bogen",
            type: "line",
            silent: true,
            z: 100,
            shape: { x1: start[0], y1: start[1], x2: ende[0], y2: ende[1] },
            invisible: !sichtbar,
            style: { ...strich, opacity: deckkraft },
          },
          {
            id: "notiz-spitze",
            type: "polyline",
            silent: true,
            z: 100,
            shape: { points: [spitze(0.5), ende, spitze(-0.5)] },
            invisible: !sichtbar,
            style: { ...strich, opacity: deckkraft },
          },
        ],
      },
    });
    return;
  }

  // Text sits a little left of the point, kept inside the plot's width.
  const tx = Math.min(Math.max(px - 40, rect.x + 80), rect.x + rect.width - 80);
  const start = [tx + 8, rect.y - 4];
  const ende = [px, py - 7];
  const dy = ende[1] - start[1];
  // An S-swing: out to the left first, then in from the right onto the point.
  // The swing grows with the arrow, so a short one does not curl into a loop.
  const cp1 = [start[0] - Math.min(36, dy * 0.4), start[1] + dy * 0.4];
  const cp2 = [ende[0] + Math.min(30, dy * 0.35), ende[1] - dy * 0.35];
  const winkel = Math.atan2(ende[1] - cp2[1], ende[0] - cp2[0]);
  const spitze = (d: number) => [ende[0] - 9 * Math.cos(winkel + d), ende[1] - 9 * Math.sin(winkel + d)];

  chart.setOption({
    graphic: {
      elements: [
        {
          id: "notiz-text",
          type: "text",
          x: tx,
          y: rect.y - 26,
          rotation: 0.05,
          silent: true,
          z: 100,
          invisible: !sichtbar,
          style: { text: notiz.text, font: `28px ${script}`, fill: NOTIZ_TINTE, align: "center", verticalAlign: "middle", opacity: deckkraft },
        },
        {
          id: "notiz-bogen",
          type: "bezierCurve",
          silent: true,
          z: 100,
          shape: { x1: start[0], y1: start[1], cpx1: cp1[0], cpy1: cp1[1], cpx2: cp2[0], cpy2: cp2[1], x2: ende[0], y2: ende[1] },
          invisible: !sichtbar,
          style: { ...strich, opacity: deckkraft },
        },
        {
          id: "notiz-spitze",
          type: "polyline",
          silent: true,
          z: 100,
          shape: { points: [spitze(0.45), ende, spitze(-0.45)] },
          invisible: !sichtbar,
          style: { ...strich, opacity: deckkraft },
        },
      ],
    },
  });
}

/** Thin React wrapper around an ECharts instance — no peer-dep baggage. */
export function EChart({ option, className, style, onEvents, ariaLabel, notiz, hervor }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const inst = useRef<Chart | null>(null);
  const notizRef = useRef(notiz);
  notizRef.current = notiz;
  // Welche Serie gerade hervorgehoben ist und welche die Legende ausgeblendet
  // hat. Beides kommt aus Ereignissen des Diagramms, nicht aus React — darum
  // Refs und ein imperatives Nachzeichnen statt eines Rerenders.
  const betont = useRef<string | null>(null);
  const versteckt = useRef<Set<string>>(new Set());

  /** Die Notiz verblasst mit ihrer Linie und verschwindet mit ihr. */
  const notizNachziehen = useCallback(() => {
    const chart = inst.current;
    const n = notizRef.current;
    if (!chart || !n) return;
    const meine = n.serien;
    const sichtbar = !meine || meine.some((s) => !versteckt.current.has(s));
    const andere = !!betont.current && !!meine && !meine.includes(betont.current);
    zeichneNotiz(chart, n, andere ? 0.2 : 1, sichtbar);
  }, []);

  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current, undefined, { renderer: "canvas" });
    inst.current = chart;
    const ro = new ResizeObserver(() => {
      chart.resize();
      notizNachziehen();
    });
    ro.observe(el.current);

    // Hover auf der Linie, Hover auf der Legende (die 'highlight' auslöst) und
    // das Ab- und Anwählen in der Legende.
    const merke = (name: string | null) => {
      betont.current = name;
      notizNachziehen();
    };
    const nameAus = (p: unknown) => {
      const e = p as { seriesName?: string; batch?: { seriesName?: string }[] };
      return e?.seriesName ?? e?.batch?.[0]?.seriesName ?? null;
    };
    chart.on("mouseover", (p) => merke(nameAus(p)));
    chart.on("mouseout", () => merke(null));
    chart.on("highlight", (p) => merke(nameAus(p)));
    chart.on("downplay", () => merke(null));
    chart.on("legendselectchanged", (p) => {
      const e = p as { selected?: Record<string, boolean> };
      versteckt.current = new Set(Object.entries(e.selected ?? {}).filter(([, an]) => !an).map(([k]) => k));
      notizNachziehen();
    });

    return () => {
      ro.disconnect();
      chart.dispose();
      inst.current = null;
    };
  }, [notizNachziehen]);

  // Canvas text does not inherit CSS fonts, and a font that is not loaded yet
  // falls back to the system font for good. So wait for the fonts, including
  // the script font that chart notes draw on the canvas.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const script = getComputedStyle(document.documentElement).getPropertyValue("--font-script");
    Promise.all([document.fonts.ready, document.fonts.load(`1em ${script}`)])
      .catch(() => undefined)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const chart = inst.current;
    if (!fontsReady || !chart) return;
    const fontFamily = getComputedStyle(document.body).fontFamily;
    // aria.enabled lets ECharts emit a generated description on the canvas.
    chart.setOption(
      { aria: { enabled: true }, ...option, textStyle: { fontFamily, ...(option.textStyle as object) } },
      true,
    );
    notizNachziehen();
  }, [option, fontsReady, notiz, notizNachziehen]);

  useEffect(() => {
    const chart = inst.current;
    if (!chart || !fontsReady) return;
    chart.dispatchAction({ type: "downplay" });
    if (hervor) chart.dispatchAction({ type: "highlight", seriesName: hervor });
  }, [hervor, fontsReady, option]);

  useEffect(() => {
    const chart = inst.current;
    if (!chart || !onEvents) return;
    for (const [ev, fn] of Object.entries(onEvents)) chart.on(ev, fn);
    return () => {
      for (const ev of Object.keys(onEvents)) chart.off(ev);
    };
  }, [onEvents]);

  return (
    <div
      ref={el}
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Diagramm"}
      style={{ width: "100%", height: 480, ...style }}
    />
  );
}
