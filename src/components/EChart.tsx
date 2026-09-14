import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, GridComponent, AriaComponent, MarkPointComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

// Register only what we actually use — keeps the bundle small.
echarts.use([
  BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart,
  TooltipComponent, LegendComponent, GridComponent, AriaComponent, MarkPointComponent,
  CanvasRenderer,
]);

interface Props {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
  /** Accessible description of the chart for screen readers. */
  ariaLabel?: string;
}

/** Thin React wrapper around an ECharts instance — no peer-dep baggage. */
export function EChart({ option, className, style, onEvents, ariaLabel }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const inst = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current, undefined, { renderer: "canvas" });
    inst.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
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
    if (!fontsReady) return;
    const fontFamily = getComputedStyle(document.body).fontFamily;
    // aria.enabled lets ECharts emit a generated description on the canvas.
    inst.current?.setOption(
      { aria: { enabled: true }, ...option, textStyle: { fontFamily, ...(option.textStyle as object) } },
      true,
    );
  }, [option, fontsReady]);

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
