import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, GridComponent, AriaComponent, GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import type { Notiz } from "@/lib/notiz";

// Register only what we actually use — keeps the bundle small.
echarts.use([
  BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart,
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
}

const NOTIZ_TINTE = "#6e5a30"; // gold-700
const NOTIZ_PFEIL = "#b8964e"; // gold-500

/**
 * Handwritten note: the text in the free margin above the plot, where no line
 * crosses it, and a curved arrow from there down to the data point. Pixel
 * positions exist only after layout, so this runs after every setOption and
 * resize. The option needs a grid top of about 56 px to leave room.
 */
function zeichneNotiz(chart: Chart, notiz: Notiz | undefined) {
  if (!notiz) return;
  const [px, py] = chart.convertToPixel({ gridIndex: 0 }, [notiz.x, notiz.y]) as number[];
  // The plot rectangle is not in the public API; the grid model exposes it.
  const modell = chart as unknown as {
    getModel(): { getComponent(t: string, i: number): { coordinateSystem: { getRect(): { x: number; y: number; width: number } } } };
  };
  const rect = modell.getModel().getComponent("grid", 0).coordinateSystem.getRect();
  const script = getComputedStyle(document.documentElement).getPropertyValue("--font-script");

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
  const strich = { stroke: NOTIZ_PFEIL, lineWidth: 1.6, fill: "none", lineCap: "round" as const, lineJoin: "round" as const };

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
          style: { text: notiz.text, font: `28px ${script}`, fill: NOTIZ_TINTE, align: "center", verticalAlign: "middle" },
        },
        {
          id: "notiz-bogen",
          type: "bezierCurve",
          silent: true,
          z: 100,
          shape: { x1: start[0], y1: start[1], cpx1: cp1[0], cpy1: cp1[1], cpx2: cp2[0], cpy2: cp2[1], x2: ende[0], y2: ende[1] },
          style: strich,
        },
        {
          id: "notiz-spitze",
          type: "polyline",
          silent: true,
          z: 100,
          shape: { points: [spitze(0.45), ende, spitze(-0.45)] },
          style: strich,
        },
      ],
    },
  });
}

/** Thin React wrapper around an ECharts instance — no peer-dep baggage. */
export function EChart({ option, className, style, onEvents, ariaLabel, notiz }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const inst = useRef<Chart | null>(null);
  const notizRef = useRef(notiz);
  notizRef.current = notiz;

  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current, undefined, { renderer: "canvas" });
    inst.current = chart;
    const ro = new ResizeObserver(() => {
      chart.resize();
      zeichneNotiz(chart, notizRef.current);
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      inst.current = null;
    };
  }, []);

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
    zeichneNotiz(chart, notiz);
  }, [option, fontsReady, notiz]);

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
